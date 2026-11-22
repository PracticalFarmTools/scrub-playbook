"""Historical replay of the strategy on settled 15-minute markets.

Data, all public:
* Settled markets (true strike, settlement value, result) from Kalshi.
* Kalshi 1-minute candlesticks for each market: YES bid/ask at each minute close.
* Coinbase 1-minute candles as the index proxy, basis-corrected to the strike.

At each decision minute t the strategy sees only data timestamped <= t. Fills
are assumed at the candle's closing quote with `depth` contracts available, so
results are an optimistic upper bound on what live trading could achieve.
"""

from __future__ import annotations

import csv
import logging
import math
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

import requests

from .assets import Asset, get_asset
from .config import BotConfig, annual_vol_to_per_second
from .fees import sweep_fee
from .kalshi.client import KalshiClient
from .markets import Market, OrderBook
from .positions import Position
from .pricing import prob_yes, var_per_s_from_closes
from .strategy import Snapshot, evaluate, sweep

log = logging.getLogger(__name__)

VOL_LOOKBACK_MIN = 60


@dataclass
class BacktestTrade:
    asset: str
    ticker: str
    minute: int
    side: str
    count: float
    price: float
    fee: float
    fair_prob: float
    model_prob: float
    market_mid: float | None
    result: str


@dataclass
class CalibrationPoint:
    asset: str
    minute: int
    model_prob: float
    market_mid: float
    outcome: int
    # Raw inputs, so the model can be re-scored under other volatility settings.
    strike: float = 0.0
    seconds_to_close: float = 0.0
    spot: float = 0.0
    raw_sigma: float = 0.0


@dataclass
class BacktestReport:
    markets: int
    trades: list[BacktestTrade]
    calibration: list[CalibrationPoint]
    market_pnl: dict[str, float]
    total_cost: float
    total_fees: float

    @property
    def pnl(self) -> float:
        return sum(self.market_pnl.values())


def fetch_coinbase_candles(product: str, start: int, end: int, session: requests.Session) -> dict[int, tuple]:
    """{start_ts: (open, high, low, close)} for 1-minute candles in [start, end)."""
    out: dict[int, tuple] = {}
    chunk = 300 * 60
    t = start
    while t < end:
        t_end = min(t + chunk, end)
        params = {
            "granularity": 60,
            "start": datetime.fromtimestamp(t, timezone.utc).isoformat(),
            "end": datetime.fromtimestamp(t_end, timezone.utc).isoformat(),
        }
        for attempt in range(4):
            resp = session.get(f"https://api.exchange.coinbase.com/products/{product}/candles", params=params, timeout=10)
            if resp.status_code == 429:
                time.sleep(1 + attempt)
                continue
            resp.raise_for_status()
            break
        for ts, low, high, open_, close, _vol in resp.json():
            out[int(ts)] = (float(open_), float(high), float(low), float(close))
        t = t_end
        time.sleep(0.15)
    return out


def _quote(candle: dict, key: str) -> float | None:
    value = (candle.get(key) or {}).get("close_dollars")
    if value is None:
        return None
    v = float(value)
    return v if 0 < v < 1 else None


def backtest_asset(
    asset: Asset,
    cfg: BotConfig,
    client: KalshiClient,
    session: requests.Session,
    start: int,
    end: int,
    depth: float,
) -> BacktestReport:
    s = cfg.strategy
    min_sigma = annual_vol_to_per_second(s.min_annual_vol)
    markets = [
        Market.from_api(m)
        for m in client.iter_markets(series_ticker=asset.series, status="settled", min_close_ts=start, max_close_ts=end, limit=1000)
    ]
    markets = sorted((m for m in markets if m.is_settled and m.strike is not None), key=lambda m: m.close_ts)
    log.info("%s: %d settled markets in range", asset.symbol, len(markets))
    if not markets or not asset.coinbase:
        return BacktestReport(0, [], [], {}, 0.0, 0.0)

    first_open = int(min(m.open_ts for m in markets))
    candles = fetch_coinbase_candles(
        asset.coinbase, first_open - (VOL_LOOKBACK_MIN + 5) * 60, int(max(m.close_ts for m in markets)), session
    )

    trades: list[BacktestTrade] = []
    calibration: list[CalibrationPoint] = []
    market_pnl: dict[str, float] = {}
    total_cost = total_fees = 0.0

    for market in markets:
        open_ts, close_ts = int(market.open_ts), int(market.close_ts)
        anchor = candles.get(open_ts - 60)
        if anchor is None:
            continue
        basis = market.strike - sum(anchor) / 4
        try:
            kc = client.get_candlesticks(asset.series, market.ticker, open_ts, close_ts, 1)
        except Exception as exc:
            log.warning("candles for %s failed: %s", market.ticker, exc)
            continue
        time.sleep(0.05)
        by_end = {int(c["end_period_ts"]): c for c in kc}
        outcome = 1 if market.result == "yes" else 0
        position = Position(market.ticker, asset.symbol, close_ts)
        minutes = int((close_ts - open_ts) // 60)

        for minute in range(1, minutes):
            t = open_ts + 60 * minute
            k = by_end.get(t)
            cb = candles.get(t - 60)
            if k is None or cb is None:
                continue
            yes_bid, yes_ask = _quote(k, "yes_bid"), _quote(k, "yes_ask")
            if yes_bid is None or yes_ask is None or yes_ask < yes_bid:
                continue
            closes = [candles[ts][3] for ts in range(t - 60 * VOL_LOOKBACK_MIN, t, 60) if ts in candles]
            var = var_per_s_from_closes(closes, 60.0)
            if var is None:
                continue
            raw_sigma = math.sqrt(var)
            sigma = max(raw_sigma * s.vol_multiplier, min_sigma)
            book = OrderBook([(yes_bid, depth)], [(round(1 - yes_ask, 4), depth)], t)
            spot = cb[3] + basis
            snap = Snapshot(asset.symbol, market, book, t, spot, sigma)
            mid = book.yes_mid()

            room = max(cfg.risk.max_market_risk - position.worst_case_loss(), 0.0)
            ev = evaluate(snap, position, s, cfg.risk.bankroll, room, cfg.allow_fractional)
            if ev.model_prob is not None and mid is not None:
                calibration.append(
                    CalibrationPoint(
                        asset.symbol, minute, ev.model_prob, mid, outcome, market.strike, close_ts - t, spot, raw_sigma
                    )
                )
            sig = ev.signal
            if (
                sig is None
                or position.orders >= cfg.risk.max_orders_per_market
                or t - position.last_order_ts < cfg.risk.order_cooldown_s
            ):
                continue
            fills = sweep(book.asks(sig.side), sig.count)
            fee = sweep_fee(fills)
            filled = sum(q for _, q in fills)
            price = sum(p * q for p, q in fills) / filled
            position = position.with_fill(sig.side, filled, price, fee)
            position.orders += 1
            position.last_order_ts = t
            trades.append(
                BacktestTrade(asset.symbol, market.ticker, minute, sig.side, filled, price, fee, sig.fair_prob, sig.model_prob, mid, market.result)
            )

        if not position.is_flat:
            market_pnl[market.ticker] = position.payout(market.result) - position.cost
            total_cost += position.cost
            total_fees += position.fees

    return BacktestReport(len(markets), trades, calibration, market_pnl, total_cost, total_fees)


def merge(reports: list[BacktestReport]) -> BacktestReport:
    return BacktestReport(
        markets=sum(r.markets for r in reports),
        trades=[t for r in reports for t in r.trades],
        calibration=[c for r in reports for c in r.calibration],
        market_pnl={k: v for r in reports for k, v in r.market_pnl.items()},
        total_cost=sum(r.total_cost for r in reports),
        total_fees=sum(r.total_fees for r in reports),
    )


def brier(points: list[CalibrationPoint], attr: str) -> float:
    return sum((getattr(p, attr) - p.outcome) ** 2 for p in points) / len(points)


def brier_for_vol(points: list[CalibrationPoint], multiplier: float, min_sigma: float, blend: float = 0.0) -> float:
    total = 0.0
    for p in points:
        sigma = max(p.raw_sigma * multiplier, min_sigma)
        model = prob_yes(p.strike, p.seconds_to_close, p.spot, sigma)
        total += ((1 - blend) * model + blend * p.market_mid - p.outcome) ** 2
    return total / len(points)


def format_vol_sweep(report: BacktestReport, multipliers: list[float], min_annual_vol: float) -> str:
    cal = report.calibration
    if not cal:
        return ""
    min_sigma = annual_vol_to_per_second(min_annual_vol)
    lines = [f"Volatility multiplier sweep (model Brier; market mid is {brier(cal, 'market_mid'):.4f}):"]
    scores = {m: brier_for_vol(cal, m, min_sigma) for m in multipliers}
    best = min(scores, key=scores.get)
    for m, score in scores.items():
        lines.append(f"  x{m:<5.2f} {score:.4f}{'  <- best' if m == best else ''}")
    blends = ", ".join(f"{w:.2f}: {brier_for_vol(cal, best, min_sigma, w):.4f}" for w in (0.25, 0.5, 0.75))
    lines.append(f"  Blended with market mid at x{best:.2f} (weight on mid: Brier) {blends}")
    return "\n".join(lines)


def format_report(report: BacktestReport, label: str) -> str:
    lines = [f"=== Backtest: {label} ==="]
    lines.append(f"Settled markets replayed: {report.markets}")
    cal = report.calibration
    if cal:
        lines.append(
            f"Brier score over {len(cal)} market-minutes: model {brier(cal, 'model_prob'):.4f}"
            f" | market mid {brier(cal, 'market_mid'):.4f} (lower is better)"
        )
        lines.append("Model calibration (predicted P(YES) bucket -> realized YES rate):")
        for lo in [i / 10 for i in range(10)]:
            pts = [p for p in cal if lo <= p.model_prob < lo + 0.1 or (lo == 0.9 and p.model_prob == 1.0)]
            if pts:
                avg = sum(p.model_prob for p in pts) / len(pts)
                hit = sum(p.outcome for p in pts) / len(pts)
                lines.append(f"  {lo:.1f}-{lo + 0.1:.1f}: n={len(pts):5d}  predicted {avg:.3f}  realized {hit:.3f}")
    trades = report.trades
    lines.append(f"Trades: {len(trades)} in {len(report.market_pnl)} markets")
    if trades:
        wins = sum(1 for v in report.market_pnl.values() if v > 0)
        contracts = sum(t.count for t in trades)
        roi = report.pnl / report.total_cost if report.total_cost else 0.0
        lines.append(f"Contracts: {contracts:.2f}  avg entry {sum(t.price * t.count for t in trades) / contracts:.3f}")
        lines.append(f"Markets won: {wins}/{len(report.market_pnl)} ({wins / len(report.market_pnl):.1%})")
        lines.append(
            f"Net PnL: ${report.pnl:+.2f} after ${report.total_fees:.2f} fees on ${report.total_cost:.2f} deployed (ROI {roi:+.1%})"
        )
        by_side = {s: [t for t in trades if t.side == s] for s in ("yes", "no")}
        lines.append("Entries by side: " + ", ".join(f"{s.upper()} {len(v)}" for s, v in by_side.items()))
        early = [t for t in trades if t.minute <= 7]
        lines.append(f"Entries in minutes 1-7: {len(early)}, minutes 8-14: {len(trades) - len(early)}")
    return "\n".join(lines)


def run_backtest(
    cfg: BotConfig,
    assets: list[str],
    days: float,
    depth: float = 50.0,
    csv_path: str | None = None,
    client: KalshiClient | None = None,
    vol_sweep: list[float] | None = None,
    offset_days: float = 0.0,
) -> BacktestReport:
    client = client or KalshiClient(cfg.env)
    session = requests.Session()
    end = int((time.time() - offset_days * 86400) // 900 * 900)
    start = int(end - days * 86400)
    fmt = "%Y-%m-%d %H:%M %Z"
    print(f"Window: {time.strftime(fmt, time.localtime(start))} to {time.strftime(fmt, time.localtime(end))}\n")
    reports = []
    for symbol in assets:
        report = backtest_asset(get_asset(symbol), cfg, client, session, start, end, depth)
        print(format_report(report, symbol))
        if vol_sweep:
            print(format_vol_sweep(report, vol_sweep, cfg.strategy.min_annual_vol))
        print()
        reports.append(report)
    total = merge(reports)
    if len(reports) > 1:
        print(format_report(total, ", ".join(assets)))
        if vol_sweep:
            print(format_vol_sweep(total, vol_sweep, cfg.strategy.min_annual_vol))
    if csv_path and total.trades:
        with open(csv_path, "w", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(asdict(total.trades[0])))
            writer.writeheader()
            writer.writerows(asdict(t) for t in total.trades)
        print(f"\nWrote {len(total.trades)} trades to {csv_path}")
    return total
