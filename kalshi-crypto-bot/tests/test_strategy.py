import pytest

from kalshi_bot.config import StrategyConfig
from kalshi_bot.positions import Position
from kalshi_bot.strategy import Snapshot, evaluate, max_count_for_risk, round_count, sweep

from .helpers import book_with_yes_quote, make_book, make_market

SIGMA = 0.0004  # per sqrt-second, ~71% annualized
# With 5 minutes left these leads give model P(YES) of about 0.9 and 0.1.
SPOT_UP, SPOT_DOWN = 100.85, 99.15


def snap(book, spot=100.0, now=600.0, strike=100.0, **kw):
    return Snapshot("BTC", make_market(strike=strike), book, now, spot, SIGMA, **kw)


def cfg(**kw):
    base = dict(min_edge=0.04, market_blend=0.0, kelly_fraction=0.25)
    base.update(kw)
    return StrategyConfig(**base)


def flat():
    return Position("KXBTC15M-TEST-00", "BTC", 900.0)


def test_buys_yes_when_model_is_above_the_ask():
    # 5 minutes left, spot 0.85% above strike.
    ev = evaluate(snap(book_with_yes_quote(0.68, 0.70), spot=SPOT_UP), flat(), cfg(), bankroll=1000, risk_room=100)
    assert ev.model_prob > 0.85
    sig = ev.signal
    assert sig is not None and sig.side == "yes"
    assert sig.limit_price == 0.70
    assert sig.edge >= 0.04
    assert sig.count > 0


def test_buys_no_in_the_mirror_case():
    ev = evaluate(snap(book_with_yes_quote(0.30, 0.32), spot=SPOT_DOWN), flat(), cfg(), bankroll=1000, risk_room=100)
    assert ev.signal is not None and ev.signal.side == "no"
    assert ev.signal.limit_price == pytest.approx(0.70)


def test_no_trade_when_price_is_fair():
    ev = evaluate(snap(book_with_yes_quote(0.49, 0.51)), flat(), cfg(), bankroll=1000, risk_room=100)
    assert ev.model_prob == pytest.approx(0.5)
    assert ev.signal is None and ev.reason == "no edge"
    assert ev.yes_edge < 0 and ev.no_edge < 0


def test_market_blend_pulls_fair_value_toward_mid():
    book = book_with_yes_quote(0.68, 0.70)
    pure = evaluate(snap(book, spot=SPOT_UP), flat(), cfg(), 1000, 100)
    blended = evaluate(snap(book, spot=SPOT_UP), flat(), cfg(market_blend=0.5), 1000, 100)
    assert blended.fair_prob == pytest.approx(0.5 * pure.model_prob + 0.5 * 0.69)


@pytest.mark.parametrize(
    "now,reason",
    [(30.0, "waiting for the window to mature"), (890.0, "too close to close")],
)
def test_timing_gates(now, reason):
    ev = evaluate(snap(book_with_yes_quote(0.10, 0.12), spot=101, now=now), flat(), cfg(), 1000, 100)
    assert ev.signal is None and ev.reason == reason


def test_strike_not_published():
    ev = evaluate(snap(book_with_yes_quote(0.4, 0.5), strike=None), flat(), cfg(), 1000, 100)
    assert ev.signal is None and ev.model_prob is None


def test_price_band_blocks_expensive_favorites():
    # Model ~1.0 but the ask is 0.97, above max_price.
    ev = evaluate(snap(book_with_yes_quote(0.96, 0.97), spot=101), flat(), cfg(max_price=0.95), 1000, 100)
    assert ev.signal is None


def test_wide_spread_is_skipped():
    ev = evaluate(snap(book_with_yes_quote(0.40, 0.60), spot=SPOT_UP), flat(), cfg(max_spread=0.08), 1000, 100)
    assert ev.signal is None and "spread" in ev.reason


def test_sweeps_only_levels_that_keep_edge():
    # Model P(YES) ~ 0.9: levels at 0.70/0.75 qualify, 0.88 does not.
    book = make_book([(0.66, 100)], [(0.30, 5), (0.25, 5), (0.12, 500)])
    ev = evaluate(snap(book, spot=SPOT_UP), flat(), cfg(max_spread=0.1, kelly_fraction=1.0), 10000, 1000)
    sig = ev.signal
    assert sig.limit_price == 0.75
    assert sig.count == 10
    assert sig.expected_price == pytest.approx(0.725)


def test_risk_room_caps_size_exactly():
    book = book_with_yes_quote(0.68, 0.70)
    ev = evaluate(snap(book, spot=SPOT_UP), flat(), cfg(kelly_fraction=1.0), bankroll=100000, risk_room=7.0)
    sig = ev.signal
    assert sig is not None
    worst = sig.count * sig.expected_price + sig.expected_fee
    assert worst <= 7.0 + 1e-9
    assert worst > 6.9


def test_hedging_side_does_not_consume_risk_room():
    # Holding 10 NO at 0.60; buying YES at 0.30 locks in a pair, reducing worst-case loss.
    pos = Position("KXBTC15M-TEST-00", "BTC", 900.0).with_fill("no", 10, 0.60, 0.17)
    levels = [(0.30, 100.0)]
    assert max_count_for_risk(pos, "yes", levels, cap=10, room=0.0, fractional=True) == 10


def test_whole_contract_rounding():
    book = book_with_yes_quote(0.68, 0.70)
    ev = evaluate(snap(book, spot=SPOT_UP), flat(), cfg(kelly_fraction=1.0), bankroll=100000, risk_room=7.0, fractional=False)
    assert ev.signal.count == int(ev.signal.count)
    assert round_count(2.999, False) == 2 and round_count(2.999, True) == 2.99


def test_zero_room_means_no_trade():
    ev = evaluate(snap(book_with_yes_quote(0.68, 0.70), spot=SPOT_UP), flat(), cfg(), bankroll=1000, risk_room=0.0)
    assert ev.signal is None and "size rounds to zero" in ev.reason


def test_dust_orders_are_skipped():
    ev = evaluate(snap(book_with_yes_quote(0.68, 0.70), spot=SPOT_UP), flat(), cfg(min_order_dollars=2.0), bankroll=1000, risk_room=1.5)
    assert ev.signal is None and "minimum" in ev.reason


def test_sweep_helper():
    assert sweep([(0.5, 3), (0.6, 10)], 5) == [(0.5, 3), (0.6, 2)]
    assert sweep([(0.5, 3)], 5) == [(0.5, 3)]
