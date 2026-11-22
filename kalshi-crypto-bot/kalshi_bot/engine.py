"""Main trading loop."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, replace
from typing import Callable

from .assets import Asset, get_asset
from .config import BotConfig, annual_vol_to_per_second
from .execution import ExecutionResult, LiveExecutor, PaperExecutor
from .feeds.base import PriceFeed
from .fees import order_fee
from .kalshi.client import KalshiClient
from .ledger import FillRecord, Ledger, OrderRecord
from .markets import Market, OrderBook
from .positions import Position
from .pricing import SETTLEMENT_WINDOW_S
from .risk import RiskManager
from .strategy import Evaluation, Snapshot, evaluate

log = logging.getLogger(__name__)

MIN_BASIS_TICKS = 30


@dataclass
class MarketState:
    asset: Asset
    market: Market | None = None
    last_refresh: float = 0.0
    basis: float | None = None
    basis_source: str = ""
    last_log: float = 0.0


class Engine:
    def __init__(
        self,
        cfg: BotConfig,
        client: KalshiClient,
        feed: PriceFeed,
        executor: PaperExecutor | LiveExecutor,
        ledger: Ledger,
        risk: RiskManager,
        clock: Callable[[], float] = time.time,
        balance_fn: Callable[[], float] | None = None,
    ):
        self.cfg = cfg
        self.client = client
        self.feed = feed
        self.executor = executor
        self.ledger = ledger
        self.risk = risk
        self.clock = clock
        self.balance_fn = balance_fn
        self.states = {s: MarketState(get_asset(s)) for s in cfg.assets if s in feed.states}
        self.rolling_basis: dict[str, float] = {}
        self._settle_checked: dict[str, float] = {}
        self._balance: tuple[float, float] | None = None
        self._stop = False
        self.min_sigma = annual_vol_to_per_second(cfg.strategy.min_annual_vol)
        halted = ledger.halted_tickers()
        if halted:
            log.warning("Markets halted by earlier orders with unknown outcomes: %s", ", ".join(sorted(halted)))
        self.risk.halted_markets |= halted

    def stop(self) -> None:
        self._stop = True

    def run(self, duration_s: float | None = None) -> None:
        started = self.clock()
        while not self._stop:
            tick_start = time.time()
            self.tick()
            if duration_s is not None and self.clock() - started >= duration_s:
                break
            time.sleep(max(0.0, self.cfg.poll_interval_s - (time.time() - tick_start)))

    def tick(self) -> None:
        now = self.clock()
        positions = self.ledger.open_positions()
        day_start = self.risk.day_start(now)
        realized_today = self.ledger.realized_pnl(day_start)
        reserved = self.ledger.ambiguous_exposure(day_start)
        for symbol, state in self.states.items():
            try:
                reserved += self._tick_asset(state, now, positions, realized_today, reserved)
            except Exception:
                log.exception("%s tick failed", symbol)
        try:
            self._settle(now, positions)
        except Exception:
            log.exception("settlement check failed")

    def _refresh_market(self, state: MarketState, now: float) -> None:
        state.last_refresh = now
        data = self.client.get_markets(series_ticker=state.asset.series, status="open", limit=10)
        live = [Market.from_api(m) for m in data.get("markets", [])]
        live = [m for m in live if m.open_ts <= now < m.close_ts]
        new = min(live, key=lambda m: m.close_ts) if live else None
        if new and (state.market is None or new.ticker != state.market.ticker):
            log.info(
                "%s now trading %s (closes %s, strike %s)",
                state.asset.symbol,
                new.ticker,
                time.strftime("%H:%M:%S", time.localtime(new.close_ts)),
                new.strike,
            )
            state.basis, state.basis_source = None, ""
        state.market = new

    def _basis(self, state: MarketState, market: Market) -> float:
        """Offset that maps the proxy feed onto the settlement index."""
        if self.feed.is_settlement_index:
            return 0.0
        symbol = state.asset.symbol
        if state.basis is None and market.strike is not None:
            total, n = self.feed.window(symbol, market.open_ts - SETTLEMENT_WINDOW_S, market.open_ts)
            if n >= MIN_BASIS_TICKS:
                state.basis = market.strike - total / n
                state.basis_source = "strike"
                self.rolling_basis[symbol] = state.basis
            elif symbol in self.rolling_basis:
                state.basis, state.basis_source = self.rolling_basis[symbol], "rolling"
            else:
                state.basis_source = "uncalibrated"
        return state.basis if state.basis is not None else 0.0

    def _bankroll(self) -> float:
        if self.cfg.mode == "paper" or self.balance_fn is None:
            return max(self.cfg.risk.bankroll + self.ledger.realized_pnl(), 0.0)
        now = time.time()
        if self._balance is None or now - self._balance[0] > 30:
            self._balance = (now, self.balance_fn())
        return min(self._balance[1], self.cfg.risk.bankroll)

    def _tick_asset(
        self, state: MarketState, now: float, positions: dict[str, Position], realized_today: float, reserved: float = 0.0
    ) -> float:
        """Run one asset's tick. Returns additional risk to reserve for later assets this tick."""
        symbol = state.asset.symbol
        market = state.market
        if (market is None or now >= market.close_ts) and now - state.last_refresh >= 2.0:
            self._refresh_market(state, now)
            market = state.market
        if market is None or now >= market.close_ts:
            return 0.0
        if market.strike is None and now - state.last_refresh >= 2.0:
            state.last_refresh = now
            state.market = market = Market.from_api(self.client.get_market(market.ticker))

        latest = self.feed.latest(symbol)
        if latest is None:
            return 0.0
        tick_ts, raw_spot = latest
        basis = self._basis(state, market)
        spot = raw_spot + basis
        window_sum, window_n = self.feed.window(symbol, market.close_ts - SETTLEMENT_WINDOW_S, now)
        window_sum += basis * window_n
        sigma_raw, vol_samples = self.feed.sigma(symbol)
        sigma = max((sigma_raw or 0.0) * self.cfg.strategy.vol_multiplier, self.min_sigma)

        book = OrderBook.from_api(self.client.get_orderbook(market.ticker), now)
        position = positions.get(market.ticker) or Position(market.ticker, symbol, market.close_ts)
        snap = Snapshot(symbol, market, book, now, spot, sigma, window_sum, window_n)
        room = self.risk.room(market.ticker, positions, realized_today, reserved)
        ev = evaluate(snap, position, self.cfg.strategy, self._bankroll(), room, self.cfg.allow_fractional)

        # Unfilled orders count toward the cooldown and order cap too, so an empty IOC cannot be resent every tick.
        sent, last_sent = self.ledger.order_activity(market.ticker)
        activity = replace(
            position, orders=max(position.orders, sent), last_order_ts=max(position.last_order_ts, last_sent)
        )
        gate = self.risk.gate(activity, now, now - tick_ts, vol_samples, realized_today)
        if gate is None and state.basis is None and not self.feed.is_settlement_index:
            # An unknown proxy-to-index offset can look like several cents of edge.
            gate = "proxy basis uncalibrated until the next market opens"
        if ev.signal and gate:
            ev.signal, ev.reason = None, f"blocked: {gate}"

        if ev.signal or now - state.last_log >= self.cfg.log_every_s:
            state.last_log = now
            self._log_status(state, snap, basis, ev, position)

        if ev.signal:
            sig = ev.signal
            result = self.executor.execute(sig)
            outcome = "ambiguous" if result.ambiguous else "filled" if result.filled > 0 else "unfilled"
            max_cost = sig.count * sig.limit_price + order_fee(sig.count, min(sig.limit_price, 0.5))
            self.ledger.record_order(
                OrderRecord(
                    ts=now,
                    asset=symbol,
                    ticker=market.ticker,
                    close_ts=market.close_ts,
                    side=sig.side,
                    count=sig.count,
                    limit_price=sig.limit_price,
                    outcome=outcome,
                    filled=result.filled,
                    max_cost=max_cost,
                    order_id=result.order_id,
                )
            )
            if result.ambiguous:
                self.risk.halted_markets.add(market.ticker)
                log.error(
                    "%s halted: reconcile %s (order %s) manually on Kalshi", symbol, market.ticker, result.order_id
                )
                return max_cost
            if result.filled > 0:
                self._record(sig, result, market, now, spot)
                positions[market.ticker] = position.with_fill(sig.side, result.filled, result.avg_price, result.fee)
            else:
                log.info("%s %s order for %s got no fill", symbol, sig.side.upper(), market.ticker)
        return 0.0

    def _record(self, sig, result: ExecutionResult, market: Market, now: float, spot: float) -> None:
        self.ledger.record_fill(
            FillRecord(
                ts=now,
                asset=sig.asset,
                ticker=sig.ticker,
                close_ts=market.close_ts,
                side=sig.side,
                count=result.filled,
                price=result.avg_price,
                fee=result.fee,
                order_id=result.order_id,
                fair_prob=sig.fair_prob,
                model_prob=sig.model_prob,
                edge=sig.edge,
                spot=spot,
                strike=market.strike,
            )
        )
        log.info(
            "FILL %s %s %.2f %s @ %.4f fee $%.2f (fair %.3f, edge %.3f/contract) [%s]",
            sig.asset,
            sig.ticker,
            result.filled,
            sig.side.upper(),
            result.avg_price,
            result.fee,
            sig.fair_prob,
            sig.edge,
            result.order_id,
        )

    def _log_status(self, state: MarketState, snap: Snapshot, basis: float, ev: Evaluation, position: Position) -> None:
        m = snap.market
        left = max(m.seconds_to_close(snap.now), 0)
        bid, ask = snap.book.best_bid("yes"), snap.book.best_ask("yes")
        annual_vol = snap.sigma * (365 * 24 * 3600) ** 0.5 * 100

        def f(x, fmt):
            return format(x, fmt) if x is not None else "-"

        held = ""
        if not position.is_flat:
            held = f" | holding {position.yes_count:g}Y/{position.no_count:g}N cost ${position.cost:.2f}"
        log.info(
            "%-4s %s | %02d:%02d left | K %s S %s (basis %+.4g%s) | vol %.0f%% | model %s fair %s"
            " | YES %s/%s | edge Y %s N %s | %s%s",
            state.asset.symbol,
            m.ticker,
            left // 60,
            left % 60,
            f(m.strike, ".6g"),
            f(snap.spot, ".6g"),
            basis,
            f" {state.basis_source}" if state.basis_source else "",
            annual_vol,
            f(ev.model_prob, ".3f"),
            f(ev.fair_prob, ".3f"),
            f(bid, ".3f"),
            f(ask, ".3f"),
            f(ev.yes_edge, "+.3f"),
            f(ev.no_edge, "+.3f"),
            ev.reason,
            held,
        )

    def _settle(self, now: float, positions: dict[str, Position]) -> None:
        for ticker, pos in positions.items():
            if now < pos.close_ts + 3 or now - self._settle_checked.get(ticker, 0.0) < 10:
                continue
            self._settle_checked[ticker] = now
            market = Market.from_api(self.client.get_market(ticker))
            if not market.is_settled:
                continue
            pnl = self.ledger.record_settlement(pos, market.result, now, market.expiration_value)
            log.info(
                "SETTLED %s %s -> %s (index %s vs strike %s): payout $%.2f cost $%.2f PnL %+.2f",
                pos.asset,
                ticker,
                market.result.upper(),
                market.expiration_value,
                market.strike,
                pos.payout(market.result),
                pos.cost,
                pnl,
            )
