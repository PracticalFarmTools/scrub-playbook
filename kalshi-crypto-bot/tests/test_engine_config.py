from datetime import datetime, timezone

import pytest

from kalshi_bot.assets import get_asset
from kalshi_bot.config import BotConfig, RiskConfig, StrategyConfig, load_config
from kalshi_bot.engine import Engine
from kalshi_bot.execution import PaperExecutor
from kalshi_bot.feeds.base import PriceFeed
from kalshi_bot.ledger import Ledger
from kalshi_bot.risk import RiskManager

from .helpers import TAPERED

OPEN = 1_800_000_000  # multiple of 900
CLOSE = OPEN + 900
STRIKE = 60_000.0
PROXY_OFFSET = -12.0  # proxy feed trades $12 below the settlement index


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).isoformat().replace("+00:00", "Z")


class Clock:
    def __init__(self, t):
        self.t = t

    def __call__(self):
        return self.t


class FakeFeed(PriceFeed):
    name = "fake"

    def __init__(self):
        super().__init__([get_asset("BTC")])

    def _run(self):
        pass


class FakeKalshi:
    authenticated = False

    def __init__(self):
        self.result = ""
        self.yes_ask = 0.62
        self.calls = {"orderbook": 0, "get_market": 0}

    def market(self):
        return {
            "ticker": "KXBTC15M-TEST-00",
            "event_ticker": "KXBTC15M-TEST",
            "status": "finalized" if self.result else "active",
            "open_time": iso(OPEN),
            "close_time": iso(CLOSE),
            "floor_strike": STRIKE,
            "strike_type": "greater_or_equal",
            "price_ranges": TAPERED,
            "result": self.result,
            "expiration_value": "60310.00" if self.result else "",
        }

    def get_markets(self, **params):
        return {"markets": [] if self.result else [self.market()]}

    def get_market(self, ticker):
        self.calls["get_market"] += 1
        return self.market()

    def get_orderbook(self, ticker, depth=10):
        self.calls["orderbook"] += 1
        no_bid = f"{1 - self.yes_ask:.4f}"
        return {"orderbook_fp": {"yes_dollars": [[f"{self.yes_ask - 0.02:.4f}", "500.00"]], "no_dollars": [[no_bid, "500.00"]]}}


def make_engine(tmp_path, clock):
    cfg = BotConfig(
        assets=["BTC"],
        data_dir=str(tmp_path),
        strategy=StrategyConfig(market_blend=0.0, min_edge=0.04),
        risk=RiskConfig(bankroll=1000, max_market_risk=40, max_total_risk=100, max_daily_loss=100, min_vol_samples=5),
    )
    client = FakeKalshi()
    feed = FakeFeed()
    feed.states["BTC"].vol.seed((0.6 / (365 * 24 * 3600) ** 0.5) ** 2, 100)
    ledger = Ledger(tmp_path / "paper.sqlite")
    engine = Engine(cfg, client, feed, PaperExecutor(client), ledger, RiskManager(cfg.risk, kill_file=tmp_path / "KILL"), clock=clock)
    return engine, client, feed, ledger


def test_engine_trades_and_settles_a_full_market(tmp_path):
    clock = Clock(OPEN + 300)
    engine, client, feed, ledger = make_engine(tmp_path, clock)
    # Proxy averaged STRIKE + offset before the open, then rallied 0.5% above the strike.
    for t in range(OPEN - 120, OPEN + 1):
        feed._on_tick("BTC", float(t), STRIKE + PROXY_OFFSET)
    for t in range(OPEN + 1, OPEN + 301):
        feed._on_tick("BTC", float(t), STRIKE * 1.005 + PROXY_OFFSET)

    engine.tick()
    state = engine.states["BTC"]
    assert state.market.ticker == "KXBTC15M-TEST-00"
    assert state.basis == pytest.approx(-PROXY_OFFSET)
    positions = ledger.open_positions()
    pos = positions["KXBTC15M-TEST-00"]
    assert pos.yes_count > 0 and pos.no_count == 0
    assert pos.worst_case_loss() <= 40 + 1e-9

    # A second tick inside the cooldown must not trade again.
    clock.t += 2
    feed._on_tick("BTC", clock.t, STRIKE * 1.005 + PROXY_OFFSET)
    engine.tick()
    assert ledger.open_positions()["KXBTC15M-TEST-00"].orders == 1

    # After close the market settles YES and the ledger books the PnL.
    client.result = "yes"
    clock.t = CLOSE + 20
    feed._on_tick("BTC", clock.t, STRIKE * 1.005 + PROXY_OFFSET)
    engine.tick()
    assert ledger.open_positions() == {}
    assert ledger.realized_pnl() == pytest.approx(pos.yes_count - pos.cost)
    assert ledger.realized_pnl() > 0


def test_engine_respects_kill_switch_and_stale_feed(tmp_path):
    clock = Clock(OPEN + 300)
    engine, client, feed, ledger = make_engine(tmp_path, clock)
    for t in range(OPEN - 120, OPEN + 290):  # last tick 10s old -> stale
        feed._on_tick("BTC", float(t), STRIKE * (1.005 if t > OPEN else 1.0))
    engine.tick()
    assert ledger.open_positions() == {}

    feed._on_tick("BTC", clock.t, STRIKE * 1.005)
    (tmp_path / "KILL").touch()
    engine.tick()
    assert ledger.open_positions() == {}

    (tmp_path / "KILL").unlink()
    engine.tick()
    assert ledger.open_positions() != {}


def test_engine_waits_for_basis_when_started_mid_window(tmp_path):
    clock = Clock(OPEN + 300)
    engine, client, feed, ledger = make_engine(tmp_path, clock)
    for t in range(OPEN + 100, OPEN + 301):  # history starts after the open
        feed._on_tick("BTC", float(t), STRIKE * 1.005)
    engine.tick()
    assert engine.states["BTC"].basis_source == "uncalibrated"
    assert ledger.open_positions() == {}

    # Once a basis is known from an earlier window, trading resumes.
    engine.rolling_basis["BTC"] = 0.0
    engine.states["BTC"].basis = None
    clock.t += 1
    feed._on_tick("BTC", clock.t, STRIKE * 1.005)
    engine.tick()
    assert engine.states["BTC"].basis_source == "rolling"
    assert ledger.open_positions() != {}


def test_load_config_from_toml(tmp_path, monkeypatch):
    monkeypatch.delenv("KALSHI_API_KEY_ID", raising=False)
    monkeypatch.delenv("KALSHI_ENV", raising=False)
    path = tmp_path / "c.toml"
    path.write_text('[bot]\nassets = ["btc", "eth"]\n\n[strategy]\nmin_edge = 0.06\n\n[risk]\nbankroll = 250.0\n')
    cfg = load_config(path)
    assert cfg.assets == ["BTC", "ETH"]
    assert cfg.strategy.min_edge == 0.06 and cfg.risk.bankroll == 250.0
    assert cfg.db_path.name == "paper.sqlite"

    path.write_text("[strategy]\nmin_edgee = 0.06\n")
    with pytest.raises(ValueError, match="Unknown config key"):
        load_config(path)


def test_live_mode_requires_credentials(monkeypatch):
    for var in ("KALSHI_API_KEY_ID", "KALSHI_PRIVATE_KEY_PATH", "KALSHI_PRIVATE_KEY"):
        monkeypatch.delenv(var, raising=False)
    with pytest.raises(ValueError, match="live mode needs"):
        load_config(None, mode="live")
    monkeypatch.setenv("KALSHI_API_KEY_ID", "abc")
    monkeypatch.setenv("KALSHI_PRIVATE_KEY_PATH", "/tmp/key.pem")
    assert load_config(None, mode="live").has_credentials


def test_example_config_matches_defaults(monkeypatch):
    monkeypatch.delenv("KALSHI_ENV", raising=False)
    from pathlib import Path

    example = load_config(Path(__file__).parent.parent / "config.example.toml")
    defaults = BotConfig()
    assert example.strategy == defaults.strategy
    assert example.risk == defaults.risk
    assert (example.assets, example.env, example.price_source) == (defaults.assets, defaults.env, defaults.price_source)


def test_unknown_asset_rejected():
    with pytest.raises(ValueError, match="Unknown asset"):
        load_config(None, assets=["PEPE"])
