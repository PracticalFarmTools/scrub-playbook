"""Entry logic: compare model fair value to the book and size taker orders."""

from __future__ import annotations

import math
from dataclasses import dataclass

from .config import StrategyConfig
from .fees import fee_per_contract, sweep_fee
from .markets import Level, Market, OrderBook
from .positions import Position
from .pricing import prob_yes

EPS = 1e-9


@dataclass
class Snapshot:
    asset: str
    market: Market
    book: OrderBook
    now: float
    spot: float
    sigma: float  # per sqrt-second, after multiplier and floor
    partial_sum: float = 0.0
    partial_n: int = 0


@dataclass
class Signal:
    asset: str
    ticker: str
    side: str  # "yes" or "no"
    limit_price: float  # worst price, in the bought side's terms
    count: float
    expected_price: float
    expected_fee: float
    fair_prob: float  # probability the bought side wins
    model_prob: float  # model P(YES)
    edge: float  # expected profit per contract after fees


@dataclass
class Evaluation:
    model_prob: float | None = None
    fair_prob: float | None = None
    yes_edge: float | None = None
    no_edge: float | None = None
    signal: Signal | None = None
    reason: str = ""


def round_count(count: float, fractional: bool) -> float:
    if count <= 0:
        return 0.0
    if fractional:
        return math.floor(count * 100 + EPS) / 100
    return float(math.floor(count + EPS))


def sweep(levels: list[Level], count: float) -> list[Level]:
    """Fills (price, qty) from taking `count` contracts off ask levels in order."""
    fills, remaining = [], count
    for price, size in levels:
        if remaining <= EPS:
            break
        take = min(size, remaining)
        fills.append((price, take))
        remaining -= take
    return fills


def _position_after(position: Position, side: str, fills: list[Level]) -> Position:
    fee = sweep_fee(fills)
    out = position
    for i, (price, qty) in enumerate(fills):
        out = out.with_fill(side, qty, price, fee if i == 0 else 0.0)
    return out


def max_count_for_risk(position: Position, side: str, levels: list[Level], cap: float, room: float, fractional: bool) -> float:
    """Largest count <= cap whose fill keeps the worst-case-loss increase within `room`."""
    base = position.worst_case_loss()
    step = 0.01 if fractional else 1.0

    def fits(c: float) -> bool:
        return _position_after(position, side, sweep(levels, c)).worst_case_loss() - base <= room + EPS

    hi = round_count(cap, fractional)
    if hi <= 0:
        return 0.0
    if fits(hi):
        return hi
    lo_units, hi_units = 0, int(round(hi / step))
    while lo_units < hi_units:
        mid = (lo_units + hi_units + 1) // 2
        if fits(mid * step):
            lo_units = mid
        else:
            hi_units = mid - 1
    return round(lo_units * step, 2)


def evaluate(
    snap: Snapshot,
    position: Position,
    cfg: StrategyConfig,
    bankroll: float,
    risk_room: float,
    fractional: bool = True,
) -> Evaluation:
    ev = Evaluation()
    m = snap.market
    if m.strike is None:
        ev.reason = "strike not published yet"
        return ev
    if m.strike_type != "greater_or_equal":
        ev.reason = f"unsupported strike type {m.strike_type}"
        return ev

    tau = m.seconds_to_close(snap.now)
    ev.model_prob = prob_yes(m.strike, tau, snap.spot, snap.sigma, snap.partial_sum, snap.partial_n)

    mid = snap.book.yes_mid()
    blend = cfg.market_blend if mid is not None else 0.0
    ev.fair_prob = (1 - blend) * ev.model_prob + blend * (mid or 0.0)

    candidates: dict[str, list[tuple[float, float, float]]] = {}
    for side in ("yes", "no"):
        fair_side = ev.fair_prob if side == "yes" else 1 - ev.fair_prob
        asks = snap.book.asks(side)
        if asks:
            top = asks[0][0]
            setattr(ev, f"{side}_edge", fair_side - top - fee_per_contract(top))
        qualifying = []
        for price, size in asks:
            if price < cfg.min_price - EPS or price > cfg.max_price + EPS:
                break
            edge = fair_side - price - fee_per_contract(price)
            if edge < cfg.min_edge - EPS:
                break
            qualifying.append((price, size, edge))
        if qualifying:
            candidates[side] = qualifying

    if m.seconds_since_open(snap.now) < cfg.entry_after_open_s:
        ev.reason = "waiting for the window to mature"
        return ev
    if tau < cfg.stop_before_close_s:
        ev.reason = "too close to close"
        return ev
    spread = snap.book.yes_spread()
    if spread is not None and spread > cfg.max_spread + EPS:
        ev.reason = f"spread {spread:.3f} too wide"
        return ev
    if not candidates:
        ev.reason = "no edge"
        return ev

    side = max(candidates, key=lambda s: candidates[s][0][2])
    levels = [(p, s) for p, s, _ in candidates[side]]
    fair_side = ev.fair_prob if side == "yes" else 1 - ev.fair_prob
    top_price = levels[0][0]

    kelly = max((fair_side - top_price) / (1 - top_price), 0.0)
    kelly_count = cfg.kelly_fraction * kelly * bankroll / top_price
    depth = sum(s for _, s in levels)
    count = max_count_for_risk(position, side, levels, min(kelly_count, depth), risk_room, fractional)
    if count <= 0:
        ev.reason = "size rounds to zero (risk room or bankroll)"
        return ev

    fills = sweep(levels, count)
    premium = sum(p * q for p, q in fills)
    if premium < cfg.min_order_dollars - EPS:
        ev.reason = f"order below ${cfg.min_order_dollars:g} minimum"
        return ev
    fee = sweep_fee(fills)
    edge_total = count * fair_side - premium - fee
    if edge_total < count * cfg.min_edge - EPS:
        ev.reason = "edge consumed by fee rounding"
        return ev

    ev.signal = Signal(
        asset=snap.asset,
        ticker=m.ticker,
        side=side,
        limit_price=fills[-1][0],
        count=count,
        expected_price=premium / count,
        expected_fee=fee,
        fair_prob=fair_side,
        model_prob=ev.model_prob,
        edge=edge_total / count,
    )
    ev.reason = f"buy {side.upper()}"
    return ev
