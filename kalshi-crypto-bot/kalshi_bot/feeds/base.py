"""Shared price-feed plumbing: per-asset tick history and volatility."""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field

import requests

from ..assets import Asset
from ..pricing import PriceHistory, VolEstimator, var_per_s_from_closes

log = logging.getLogger(__name__)


@dataclass
class AssetState:
    asset: Asset
    history: PriceHistory = field(default_factory=PriceHistory)
    vol: VolEstimator = field(default_factory=VolEstimator)


class PriceFeed:
    """Owns tick history for each asset; subclasses push ticks via `_on_tick`."""

    name = "base"
    # True when ticks are the settlement index itself (no basis correction needed).
    is_settlement_index = False

    def __init__(self, assets: list[Asset], vol_halflife_s: float = 1800.0, vol_sample_s: float = 5.0):
        self.states = {
            a.symbol: AssetState(a, PriceHistory(), VolEstimator(vol_halflife_s, vol_sample_s)) for a in assets
        }
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def _on_tick(self, symbol: str, ts: float, price: float) -> None:
        state = self.states.get(symbol)
        if state is None:
            return
        with self._lock:
            if state.history.add(ts, price):
                state.vol.update(ts, price)

    def latest(self, symbol: str) -> tuple[float, float] | None:
        with self._lock:
            return self.states[symbol].history.latest()

    def window(self, symbol: str, start_exclusive: float, end_inclusive: float) -> tuple[float, int]:
        with self._lock:
            return self.states[symbol].history.window(start_exclusive, end_inclusive)

    def sigma(self, symbol: str) -> tuple[float | None, int]:
        with self._lock:
            vol = self.states[symbol].vol
            return vol.sigma(), vol.samples

    def covers(self, symbol: str, ts: float) -> bool:
        with self._lock:
            return self.states[symbol].history.covers(ts)

    def bootstrap_vol(self, session: requests.Session | None = None, minutes: int = 120) -> None:
        """Seed volatility from Coinbase 1-minute candles so trading can start without a warmup."""
        session = session or requests.Session()
        for state in self.states.values():
            product = state.asset.coinbase
            if not product:
                continue
            try:
                resp = session.get(
                    f"https://api.exchange.coinbase.com/products/{product}/candles",
                    params={"granularity": 60},
                    timeout=5,
                )
                resp.raise_for_status()
                rows = sorted(resp.json(), key=lambda r: r[0])[-minutes:]
            except (requests.RequestException, ValueError) as exc:
                log.warning("vol bootstrap for %s failed: %s", state.asset.symbol, exc)
                continue
            var = var_per_s_from_closes([float(r[4]) for r in rows], 60.0)
            if var is not None:
                with self._lock:
                    state.vol.seed(var, len(rows) - 1, span_s=60.0 * (len(rows) - 1))
                log.info(
                    "%s vol seeded from %d one-minute candles: %.1f%% annualized",
                    state.asset.symbol,
                    len(rows),
                    (var * 365 * 24 * 3600) ** 0.5 * 100,
                )

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name=f"feed-{self.name}", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    def _run(self) -> None:
        raise NotImplementedError
