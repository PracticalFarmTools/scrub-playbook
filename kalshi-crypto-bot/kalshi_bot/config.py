"""Bot configuration: TOML file for tuning, environment variables for secrets."""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field, fields, is_dataclass
from pathlib import Path
from typing import Any

from .assets import get_asset

SECONDS_PER_YEAR = 365 * 24 * 3600


@dataclass
class StrategyConfig:
    # Required expected profit per contract, in dollars, after taker fees.
    min_edge: float = 0.04
    # Weight given to the order book mid when forming fair value (0 = pure model).
    market_blend: float = 0.5
    # Never buy a side priced outside this band; tails are where model error dominates.
    min_price: float = 0.05
    max_price: float = 0.95
    # Skip a market whose YES spread is wider than this (thin or broken book).
    max_spread: float = 0.08
    # Trading window inside each 15-minute market.
    entry_after_open_s: float = 60.0
    stop_before_close_s: float = 20.0
    kelly_fraction: float = 0.15
    # Skip orders smaller than this many dollars of premium (dust left by risk caps).
    min_order_dollars: float = 2.0
    # Scale on measured volatility. Below 1 because returns are fat-tailed: a Gaussian
    # with the full realized variance overrates moderate moves (see `backtest --vol-sweep`).
    vol_multiplier: float = 0.9
    min_annual_vol: float = 0.20
    vol_halflife_s: float = 1800.0
    vol_sample_s: float = 5.0


@dataclass
class RiskConfig:
    # Capital the bot sizes against. In paper mode this is the starting balance;
    # in live mode the smaller of this and the real Kalshi balance is used.
    bankroll: float = 500.0
    # Worst-case loss limits, in dollars, including fees.
    max_market_risk: float = 40.0
    max_total_risk: float = 120.0
    # New entries stop once today's realized loss plus open worst-case loss would exceed this.
    max_daily_loss: float = 100.0
    max_orders_per_market: int = 4
    order_cooldown_s: float = 10.0
    max_feed_staleness_s: float = 5.0
    min_vol_samples: int = 20


@dataclass
class BotConfig:
    mode: str = "paper"
    env: str = "prod"
    assets: list[str] = field(default_factory=lambda: ["BTC", "ETH", "SOL"])
    # "auto" uses Kalshi's CF Benchmarks feed when credentials exist, else public exchanges.
    price_source: str = "auto"
    poll_interval_s: float = 1.0
    data_dir: str = "data"
    timezone: str = "America/New_York"
    allow_fractional: bool = True
    log_every_s: float = 15.0
    strategy: StrategyConfig = field(default_factory=StrategyConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)
    api_key_id: str | None = None
    private_key_path: str | None = None
    private_key_pem: str | None = None

    @property
    def has_credentials(self) -> bool:
        return bool(self.api_key_id and (self.private_key_path or self.private_key_pem))

    @property
    def db_path(self) -> Path:
        return Path(self.data_dir) / f"{self.mode}.sqlite"

    def validate(self) -> None:
        if self.mode not in ("paper", "live"):
            raise ValueError("mode must be 'paper' or 'live'")
        if self.env not in ("prod", "demo"):
            raise ValueError("env must be 'prod' or 'demo'")
        if self.price_source not in ("auto", "kalshi_cfb", "public"):
            raise ValueError("price_source must be 'auto', 'kalshi_cfb' or 'public'")
        for symbol in self.assets:
            get_asset(symbol)
        s, r = self.strategy, self.risk
        if not 0 <= s.market_blend < 1:
            raise ValueError("strategy.market_blend must be in [0, 1)")
        if not 0 < s.min_price < s.max_price < 1:
            raise ValueError("strategy.min_price/max_price must satisfy 0 < min < max < 1")
        if s.stop_before_close_s < 0 or s.entry_after_open_s < 0:
            raise ValueError("strategy timing windows must be non-negative")
        if not 0 < s.kelly_fraction <= 1:
            raise ValueError("strategy.kelly_fraction must be in (0, 1]")
        if min(r.bankroll, r.max_market_risk, r.max_total_risk, r.max_daily_loss) <= 0:
            raise ValueError("risk limits must be positive")
        if self.mode == "live" and not self.has_credentials:
            raise ValueError(
                "live mode needs KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY_PATH (or KALSHI_PRIVATE_KEY)"
            )


def _apply(target: Any, values: dict[str, Any], section: str) -> None:
    known = {f.name: f for f in fields(target)}
    for key, value in values.items():
        if key not in known:
            raise ValueError(f"Unknown config key [{section}] {key}")
        current = getattr(target, key)
        if is_dataclass(current):
            if not isinstance(value, dict):
                raise ValueError(f"[{section}] {key} must be a table")
            _apply(current, value, key)
        else:
            setattr(target, key, value)


def load_config(path: str | os.PathLike | None = None, **overrides: Any) -> BotConfig:
    cfg = BotConfig()
    if path:
        with open(path, "rb") as fh:
            raw = tomllib.load(fh)
        _apply(cfg, raw.pop("bot", {}), "bot")
        _apply(cfg, raw, "root")

    cfg.api_key_id = os.environ.get("KALSHI_API_KEY_ID") or cfg.api_key_id
    cfg.private_key_path = os.environ.get("KALSHI_PRIVATE_KEY_PATH") or cfg.private_key_path
    cfg.private_key_pem = os.environ.get("KALSHI_PRIVATE_KEY") or cfg.private_key_pem
    cfg.env = os.environ.get("KALSHI_ENV", cfg.env)

    for key, value in overrides.items():
        if value is not None:
            setattr(cfg, key, value)
    cfg.assets = [a.upper() for a in cfg.assets]
    cfg.validate()
    return cfg


def annual_vol_to_per_second(annual_vol: float) -> float:
    return annual_vol / SECONDS_PER_YEAR**0.5
