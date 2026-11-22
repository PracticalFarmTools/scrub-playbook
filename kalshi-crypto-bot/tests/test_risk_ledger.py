import pytest

from kalshi_bot.config import RiskConfig
from kalshi_bot.ledger import FillRecord, Ledger
from kalshi_bot.positions import Position
from kalshi_bot.risk import RiskManager


def test_worst_case_loss_and_payout_with_both_sides():
    p = Position("T").with_fill("yes", 10, 0.40, 0.17).with_fill("no", 4, 0.50, 0.09)
    assert p.cost == pytest.approx(4.0 + 0.17 + 2.0 + 0.09)
    assert p.payout("yes") == 10 and p.payout("no") == 4
    assert p.worst_case_loss() == pytest.approx(p.cost - 4)
    with pytest.raises(ValueError):
        p.payout("void")


def test_room_respects_market_total_and_daily_limits():
    risk = RiskManager(RiskConfig(max_market_risk=40, max_total_risk=60, max_daily_loss=50))
    positions = {
        "A": Position("A").with_fill("yes", 50, 0.5, 0.0),  # worst case 25
        "B": Position("B").with_fill("no", 40, 0.5, 0.0),  # worst case 20
    }
    assert risk.room("A", positions, 0.0) == pytest.approx(5)  # daily: 50 - 45
    assert risk.room("C", positions, 0.0) == pytest.approx(5)
    assert risk.room("C", positions, -3.0) == pytest.approx(2)
    assert risk.room("C", positions, +100.0) == pytest.approx(5)  # profits do not raise limits
    assert risk.room("C", {}, 0.0) == pytest.approx(40)
    assert risk.room("C", positions, -10.0) == 0.0


def test_gate_reasons(tmp_path):
    kill = tmp_path / "KILL"
    risk = RiskManager(
        RiskConfig(max_daily_loss=50, max_orders_per_market=2, order_cooldown_s=10, max_feed_staleness_s=5, min_vol_samples=10),
        kill_file=kill,
    )
    pos = Position("T")
    assert risk.gate(pos, 100, 1, 20, 0) is None
    assert "stale" in risk.gate(pos, 100, 9, 20, 0)
    assert "warming" in risk.gate(pos, 100, 1, 3, 0)
    assert "daily loss" in risk.gate(pos, 100, 1, 20, -50)
    busy = Position("T", orders=2, last_order_ts=0)
    assert "max orders" in risk.gate(busy, 100, 1, 20, 0)
    recent = Position("T", orders=1, last_order_ts=95)
    assert "cooldown" in risk.gate(recent, 100, 1, 20, 0)
    risk.halted_markets.add("T")
    assert "halted" in risk.gate(pos, 100, 1, 20, 0)
    kill.touch()
    assert "kill switch" in risk.gate(pos, 100, 1, 20, 0)


def test_day_start_uses_configured_timezone():
    risk = RiskManager(RiskConfig(), timezone="America/New_York")
    # 2026-11-22 03:00 UTC is 22:00 on Nov 21 in New York (UTC-5).
    now = 1795316400
    assert now - risk.day_start(now) == 22 * 3600


def fill(ticker, side, count, price, fee, ts=1.0, asset="BTC"):
    return FillRecord(ts=ts, asset=asset, ticker=ticker, close_ts=900.0, side=side, count=count, price=price, fee=fee)


def test_ledger_positions_settlement_and_pnl(tmp_path):
    ledger = Ledger(tmp_path / "paper.sqlite")
    ledger.record_fill(fill("A", "yes", 10, 0.60, 0.17, ts=10))
    ledger.record_fill(fill("A", "yes", 5, 0.62, 0.09, ts=20))
    ledger.record_fill(fill("B", "no", 8, 0.30, 0.12, ts=30, asset="ETH"))
    pos = ledger.open_positions()
    assert set(pos) == {"A", "B"}
    assert pos["A"].yes_count == 15 and pos["A"].orders == 2 and pos["A"].last_order_ts == 20
    assert pos["A"].cost == pytest.approx(6.0 + 3.1 + 0.26)

    pnl_a = ledger.record_settlement(pos["A"], "yes", ts=1000, expiration_value=101.0)
    assert pnl_a == pytest.approx(15 - 9.36)
    pnl_b = ledger.record_settlement(pos["B"], "yes", ts=2000, expiration_value=101.0)
    assert pnl_b == pytest.approx(-2.52)
    # Settling twice is ignored.
    ledger.record_settlement(pos["B"], "yes", ts=3000, expiration_value=101.0)

    assert ledger.open_positions() == {}
    assert ledger.realized_pnl() == pytest.approx(pnl_a + pnl_b)
    assert ledger.realized_pnl(since_ts=1500) == pytest.approx(pnl_b)
    s = ledger.summary()
    assert s["settled_markets"] == 2 and s["wins"] == 1 and s["fills"] == 3
    assert [r["asset"] for r in s["by_asset"]] == ["BTC", "ETH"]
