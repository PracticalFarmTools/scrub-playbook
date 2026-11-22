from __future__ import annotations

from kalshi_bot.markets import Market, OrderBook, PriceGrid

TAPERED = [
    {"start": "0.0000", "end": "0.1000", "step": "0.0010"},
    {"start": "0.1000", "end": "0.9000", "step": "0.0100"},
    {"start": "0.9000", "end": "1.0000", "step": "0.0010"},
]


def make_market(open_ts: float = 0.0, close_ts: float = 900.0, strike: float | None = 100.0, ticker: str = "KXBTC15M-TEST-00") -> Market:
    return Market(
        ticker=ticker,
        event_ticker=ticker.rsplit("-", 1)[0],
        series="KXBTC15M",
        status="active",
        open_ts=open_ts,
        close_ts=close_ts,
        strike=strike,
        strike_type="greater_or_equal",
        grid=PriceGrid.from_api(TAPERED),
    )


def make_book(yes_bids=(), no_bids=()) -> OrderBook:
    return OrderBook(sorted(yes_bids, key=lambda x: -x[0]), sorted(no_bids, key=lambda x: -x[0]))


def book_with_yes_quote(bid: float, ask: float, size: float = 1000.0) -> OrderBook:
    return make_book([(bid, size)], [(round(1 - ask, 4), size)])
