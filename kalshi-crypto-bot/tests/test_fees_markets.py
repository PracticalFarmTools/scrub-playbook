import pytest

from kalshi_bot.fees import fee_per_contract, order_fee, sweep_fee
from kalshi_bot.markets import Market, OrderBook, PriceGrid, format_count, format_price

from .helpers import TAPERED

LIVE_MARKET = {
    "close_time": "2026-11-22T03:45:00Z",
    "event_ticker": "KXBTC15M-26NOV212245",
    "expiration_value": "",
    "floor_strike": 59229.55,
    "open_time": "2026-11-22T03:30:00Z",
    "price_level_structure": "tapered_deci_cent",
    "price_ranges": TAPERED,
    "result": "",
    "status": "active",
    "strike_type": "greater_or_equal",
    "ticker": "KXBTC15M-26NOV212245-45",
}

LIVE_BOOK = {
    "orderbook_fp": {
        "no_dollars": [["0.3800", "120.50"], ["0.3900", "40.00"], ["0.4000", "10.00"]],
        "yes_dollars": [["0.5500", "75.00"], ["0.5700", "12.25"]],
    }
}


def test_taker_fee_matches_kalshi_schedule():
    assert order_fee(100, 0.50) == pytest.approx(1.75)
    assert order_fee(1, 0.50) == pytest.approx(0.02)  # 0.0175 rounds up to a cent
    assert order_fee(10, 0.90) == pytest.approx(0.07)  # 0.063 -> 0.07
    assert order_fee(10, 0.50, maker=True) == 0.0
    assert order_fee(100, 0.50, maker=True, fee_type="quadratic_with_maker_fees") == pytest.approx(0.44)
    assert fee_per_contract(0.5) == pytest.approx(0.0175)
    # One order across two levels rounds once: 0.875 + 0.84 = 1.715 -> 1.72 (not 0.88 + 0.84).
    assert sweep_fee([(0.5, 50), (0.6, 50)]) == pytest.approx(1.72)
    with pytest.raises(ValueError):
        order_fee(1, 0.5, fee_type="flat")


def test_tapered_grid_snapping():
    grid = PriceGrid.from_api(TAPERED)
    assert grid.is_valid(0.055) and grid.is_valid(0.55) and grid.is_valid(0.995)
    assert not grid.is_valid(0.555)
    assert grid.snap_down(0.557) == 0.55
    assert grid.snap_up(0.551) == 0.56
    assert grid.snap_down(0.0557) == 0.055
    assert grid.snap_up(0.9551) == 0.956
    assert grid.snap_up(1.2) == 1.0


def test_market_from_api():
    m = Market.from_api(LIVE_MARKET)
    assert m.series == "KXBTC15M"
    assert m.close_ts - m.open_ts == 900
    assert m.strike == 59229.55
    assert m.expiration_value is None and not m.is_settled
    settled = Market.from_api({**LIVE_MARKET, "result": "yes", "expiration_value": "59300.10"})
    assert settled.is_settled and settled.expiration_value == 59300.10


def test_orderbook_from_api_derives_asks_from_opposite_bids():
    book = OrderBook.from_api(LIVE_BOOK)
    assert book.best_bid("yes") == 0.57
    assert book.best_bid("no") == 0.40
    assert book.asks("yes") == [(0.60, 10.0), (0.61, 40.0), (0.62, 120.5)]
    assert book.best_ask("no") == pytest.approx(0.43)
    assert book.yes_mid() == pytest.approx(0.585)
    assert book.yes_spread() == pytest.approx(0.03)
    empty = OrderBook.from_api({"orderbook_fp": {"yes_dollars": [], "no_dollars": None}})
    assert empty.best_ask("yes") is None and empty.yes_mid() is None


def test_formatting():
    assert format_price(0.1) == "0.1000"
    assert format_price(1 - 0.38) == "0.6200"
    assert format_count(12.349) == "12.34"
    assert format_count(3) == "3.00"
