"""Order execution: simulated (paper) or real (live) immediate-or-cancel taker orders."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field

from .fees import sweep_fee
from .kalshi.client import KalshiAPIError, KalshiClient
from .markets import OrderBook, format_count, format_price
from .strategy import EPS, Signal, sweep

log = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    filled: float
    avg_price: float = 0.0  # in the bought side's terms
    fee: float = 0.0
    order_id: str | None = None
    fills: list[tuple[float, float]] = field(default_factory=list)
    # True when the order outcome is unknown (e.g. a timeout after sending).
    ambiguous: bool = False


class PaperExecutor:
    """Fills against a freshly fetched book, so decision-to-fill latency costs like it would live."""

    def __init__(self, client: KalshiClient):
        self.client = client

    def execute(self, signal: Signal) -> ExecutionResult:
        book = OrderBook.from_api(self.client.get_orderbook(signal.ticker, depth=20))
        levels = [(p, s) for p, s in book.asks(signal.side) if p <= signal.limit_price + EPS]
        fills = sweep(levels, signal.count)
        filled = round(sum(q for _, q in fills), 2)
        if filled <= 0:
            return ExecutionResult(0.0)
        premium = sum(p * q for p, q in fills)
        return ExecutionResult(
            filled=filled,
            avg_price=premium / filled,
            fee=sweep_fee(fills),
            order_id=f"paper-{uuid.uuid4().hex[:12]}",
            fills=fills,
        )


class LiveExecutor:
    """Create Order (V2) quotes from the YES side: buying NO at q is an `ask` at 1 - q."""

    def __init__(self, client: KalshiClient):
        if not client.authenticated:
            raise ValueError("LiveExecutor needs an authenticated KalshiClient")
        self.client = client

    def execute(self, signal: Signal) -> ExecutionResult:
        if signal.side == "yes":
            book_side, yes_price = "bid", signal.limit_price
        else:
            book_side, yes_price = "ask", 1.0 - signal.limit_price
        client_order_id = f"kb-{uuid.uuid4().hex[:24]}"
        try:
            resp = self.client.create_order(
                ticker=signal.ticker,
                book_side=book_side,
                count=format_count(signal.count),
                price=format_price(yes_price),
                time_in_force="immediate_or_cancel",
                client_order_id=client_order_id,
            )
        except KalshiAPIError as exc:
            if exc.status < 500:
                log.error("Order rejected for %s: %s", signal.ticker, exc)
                return ExecutionResult(0.0)
            log.error("Order outcome unknown for %s (%s): %s", signal.ticker, client_order_id, exc)
            return ExecutionResult(0.0, ambiguous=True)
        except Exception as exc:
            log.error("Order outcome unknown for %s (%s): %s", signal.ticker, client_order_id, exc)
            return ExecutionResult(0.0, ambiguous=True)

        filled = float(resp.get("fill_count", 0) or 0)
        if filled <= 0:
            return ExecutionResult(0.0, order_id=resp.get("order_id"))
        avg_yes = float(resp.get("average_fill_price") or yes_price)
        avg_price = avg_yes if signal.side == "yes" else 1.0 - avg_yes
        fee = float(resp.get("average_fee_paid") or 0.0) * filled
        return ExecutionResult(
            filled=filled,
            avg_price=avg_price,
            fee=fee,
            order_id=resp.get("order_id"),
            fills=[(avg_price, filled)],
        )
