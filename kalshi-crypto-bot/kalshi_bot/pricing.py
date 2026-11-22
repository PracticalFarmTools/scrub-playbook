"""Fair value of a 15-minute up/down contract.

Each market resolves YES when A_close >= K, where K is the 60-second average of
the CF Benchmarks real-time index before the window opens (the market's
`floor_strike`) and A_close is the 60-second average before it closes.

The index is modelled as driftless Brownian motion in price with per-second
volatility sigma * spot, sampled once per second (the index tick rate). At time t:

* Before the final minute, tau = seconds to close > 60. A_close equals the
  index at the start of the averaging window plus the average path inside it:
      Var = s^2 * [(tau - 60) + 60*61*121 / (6 * 60^2)]   (~ tau - 40)
* Inside the final minute, m ticks are already fixed (partial sum P) and
  r = tau ticks remain:
      mean = (P + r * spot) / (m + r)
      Var  = s^2 * r(r+1)(2r+1) / (6 (m + r)^2)

P(YES) = Phi((mean - K) / sd).
"""

from __future__ import annotations

import math
from bisect import bisect_left, bisect_right
from collections import deque
from dataclasses import dataclass

SETTLEMENT_WINDOW_S = 60


def norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


@dataclass(frozen=True)
class SettlementDistribution:
    mean: float
    sd: float

    def prob_at_least(self, strike: float) -> float:
        if self.sd <= 0:
            return 1.0 if self.mean >= strike else 0.0
        return norm_cdf((self.mean - strike) / self.sd)


def settlement_distribution(
    seconds_to_close: float,
    spot: float,
    sigma_per_sqrt_s: float,
    partial_sum: float = 0.0,
    partial_n: int = 0,
    window_s: int = SETTLEMENT_WINDOW_S,
) -> SettlementDistribution:
    tau = max(seconds_to_close, 0.0)
    if tau <= 0:
        if partial_n == 0:
            return SettlementDistribution(spot, 0.0)
        return SettlementDistribution(partial_sum / partial_n, 0.0)

    if tau > window_s:
        partial_sum, partial_n = 0.0, 0
    remaining = min(tau, float(window_s))
    pre_window = max(tau - window_s, 0.0)
    n_total = partial_n + remaining

    sigma_price = sigma_per_sqrt_s * spot
    mean = (partial_sum + remaining * spot) / n_total
    path_var = remaining * (remaining + 1) * (2 * remaining + 1) / 6.0
    var = sigma_price**2 * (pre_window * (remaining / n_total) ** 2 + path_var / n_total**2)
    return SettlementDistribution(mean, math.sqrt(max(var, 0.0)))


def prob_yes(
    strike: float,
    seconds_to_close: float,
    spot: float,
    sigma_per_sqrt_s: float,
    partial_sum: float = 0.0,
    partial_n: int = 0,
) -> float:
    dist = settlement_distribution(seconds_to_close, spot, sigma_per_sqrt_s, partial_sum, partial_n)
    return dist.prob_at_least(strike)


class PriceHistory:
    """Time-ordered index ticks for one asset."""

    def __init__(self, max_age_s: float = 3 * 3600):
        self.max_age_s = max_age_s
        self._ts: deque[float] = deque()
        self._px: deque[float] = deque()

    def __len__(self) -> int:
        return len(self._ts)

    def add(self, ts: float, price: float) -> bool:
        if price <= 0 or not math.isfinite(price):
            return False
        if self._ts and ts <= self._ts[-1]:
            return False
        self._ts.append(ts)
        self._px.append(price)
        cutoff = ts - self.max_age_s
        while self._ts and self._ts[0] < cutoff:
            self._ts.popleft()
            self._px.popleft()
        return True

    def latest(self) -> tuple[float, float] | None:
        if not self._ts:
            return None
        return self._ts[-1], self._px[-1]

    def window(self, start_exclusive: float, end_inclusive: float) -> tuple[float, int]:
        """(sum, count) of ticks with start < ts <= end."""
        ts = list(self._ts)
        lo = bisect_right(ts, start_exclusive)
        hi = bisect_right(ts, end_inclusive)
        px = list(self._px)[lo:hi]
        return sum(px), len(px)

    def window_avg(self, start_exclusive: float, end_inclusive: float) -> float | None:
        total, n = self.window(start_exclusive, end_inclusive)
        return total / n if n else None

    def covers(self, ts: float) -> bool:
        return bool(self._ts) and self._ts[0] <= ts

    def price_at(self, ts: float) -> float | None:
        """Last tick at or before ts."""
        idx = bisect_left(list(self._ts), ts + 1e-9) - 1
        return self._px[idx] if idx >= 0 else None


class VolEstimator:
    """Bias-corrected EWMA of squared log returns sampled every `sample_s` seconds.

    Weights decay with elapsed time, and the estimate is the weighted sum over
    the total weight, so early estimates are plain averages rather than being
    dominated by the first squared return.
    """

    def __init__(self, halflife_s: float = 1800.0, sample_s: float = 5.0, max_gap_s: float = 120.0):
        self.halflife_s = halflife_s
        self.sample_s = sample_s
        self.max_gap_s = max_gap_s
        self.samples = 0
        self._sum = 0.0
        self._weight = 0.0
        self._last: tuple[float, float] | None = None

    @property
    def var_per_s(self) -> float | None:
        return self._sum / self._weight if self._weight > 0 else None

    def seed(self, var_per_s: float, samples: int, span_s: float | None = None) -> None:
        """Start from an external estimate worth `span_s` seconds of observations."""
        span = span_s if span_s is not None else samples * self.sample_s
        self._weight = 1 - 0.5 ** (span / self.halflife_s)
        self._sum = var_per_s * self._weight
        self.samples = max(self.samples, samples)

    def update(self, ts: float, price: float) -> None:
        if self._last is None:
            self._last = (ts, price)
            return
        last_ts, last_px = self._last
        dt = ts - last_ts
        if dt < self.sample_s:
            return
        self._last = (ts, price)
        if dt > self.max_gap_s:
            return
        r = math.log(price / last_px)
        decay = 0.5 ** (dt / self.halflife_s)
        self._sum = decay * self._sum + (1 - decay) * (r * r / dt)
        self._weight = decay * self._weight + (1 - decay)
        self.samples += 1

    def sigma(self) -> float | None:
        return math.sqrt(self.var_per_s) if self.var_per_s is not None else None


def var_per_s_from_closes(closes: list[float], interval_s: float) -> float | None:
    rets = [math.log(b / a) for a, b in zip(closes, closes[1:]) if a > 0 and b > 0]
    if len(rets) < 5:
        return None
    return sum(r * r for r in rets) / len(rets) / interval_s
