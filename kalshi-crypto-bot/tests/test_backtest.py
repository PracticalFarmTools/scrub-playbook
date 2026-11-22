import pytest

from kalshi_bot.assets import get_asset
from kalshi_bot.backtest import backtest_asset, brier_for_vol
from kalshi_bot.config import BotConfig, RiskConfig, StrategyConfig

from .test_engine_config import CLOSE, OPEN, iso

STRIKE = 60_000.0


class FakeResponse:
    status_code = 200

    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self.payload


class FakeCoinbase:
    """1-minute candles [ts, low, high, open, close, volume] from a price function."""

    def __init__(self, price_at):
        self.price_at = price_at

    def get(self, url, params=None, timeout=None):
        from datetime import datetime

        start = int(datetime.fromisoformat(params["start"]).timestamp())
        end = int(datetime.fromisoformat(params["end"]).timestamp())
        rows = []
        for ts in range(start, end, 60):
            p = self.price_at(ts)
            rows.append([ts, p, p, p, p, 1.0])
        return FakeResponse(rows)


class FakeKalshi:
    def __init__(self, result="yes", yes_bid=0.48, yes_ask=0.50):
        self.result, self.yes_bid, self.yes_ask = result, yes_bid, yes_ask

    def iter_markets(self, **params):
        yield {
            "ticker": "KXBTC15M-BT-00",
            "event_ticker": "KXBTC15M-BT",
            "status": "finalized",
            "open_time": iso(OPEN),
            "close_time": iso(CLOSE),
            "floor_strike": STRIKE,
            "strike_type": "greater_or_equal",
            "result": self.result,
            "expiration_value": "60100",
        }

    def get_candlesticks(self, series, ticker, start, end, interval):
        return [
            {
                "end_period_ts": t,
                "yes_bid": {"close_dollars": f"{self.yes_bid:.4f}"},
                "yes_ask": {"close_dollars": f"{self.yes_ask:.4f}"},
            }
            for t in range(start + 60, end + 1, 60)
        ]


def cfg():
    return BotConfig(
        strategy=StrategyConfig(market_blend=0.0, vol_multiplier=1.0, min_annual_vol=0.5),
        risk=RiskConfig(bankroll=1000, max_market_risk=40, order_cooldown_s=60),
    )


def run(price_at, **kalshi):
    return backtest_asset(get_asset("BTC"), cfg(), FakeKalshi(**kalshi), FakeCoinbase(price_at), OPEN - 3600, CLOSE, depth=50)


def wiggle(ts):
    # Small alternating moves give a realistic, nonzero volatility estimate.
    return 0.0005 if (ts // 60) % 2 else -0.0005


def test_backtest_buys_the_rally_and_books_pnl():
    # Proxy sits $5 under the strike before the open, then rallies 0.6%.
    def price(ts):
        base = STRIKE - 5 if ts < OPEN else STRIKE * 1.006 - 5
        return base * (1 + wiggle(ts))

    report = run(price)
    assert report.markets == 1
    assert report.trades and all(t.side == "yes" for t in report.trades)
    assert report.pnl > 0
    first = report.calibration[0]
    # Basis correction maps the proxy back onto the strike scale.
    assert first.spot == pytest.approx(STRIKE * 1.006 * (1 + wiggle(OPEN)), rel=1e-3)
    assert brier_for_vol(report.calibration, 1.0, 0.0) == pytest.approx(
        sum((c.model_prob - c.outcome) ** 2 for c in report.calibration) / len(report.calibration), rel=1e-9
    )


def test_backtest_has_no_lookahead():
    # The only move happens in the final minute, which no decision may observe.
    def price(ts):
        return STRIKE * (1.05 if ts >= CLOSE - 60 else 1.0) * (1 + wiggle(ts) * 0.01)

    report = run(price)
    assert report.trades == []
    assert all(abs(c.model_prob - 0.5) < 0.1 for c in report.calibration)
