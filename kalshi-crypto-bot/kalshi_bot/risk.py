"""Pre-trade risk gates and capacity limits."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from .config import RiskConfig
from .positions import Position


class RiskManager:
    def __init__(self, cfg: RiskConfig, timezone: str = "America/New_York", kill_file: str | Path | None = None):
        self.cfg = cfg
        self.tz = ZoneInfo(timezone)
        self.kill_file = Path(kill_file) if kill_file else None
        self.halted_markets: set[str] = set()

    def day_start(self, now: float) -> float:
        local = datetime.fromtimestamp(now, self.tz)
        return local.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()

    def room(self, ticker: str, positions: dict[str, Position], realized_today: float) -> float:
        """Additional worst-case loss, in dollars, that a new order in `ticker` may add."""
        market_wcl = positions[ticker].worst_case_loss() if ticker in positions else 0.0
        total_wcl = sum(p.worst_case_loss() for p in positions.values())
        market_room = self.cfg.max_market_risk - market_wcl
        total_room = self.cfg.max_total_risk - total_wcl
        daily_room = self.cfg.max_daily_loss + min(realized_today, 0.0) - total_wcl
        return max(min(market_room, total_room, daily_room), 0.0)

    def gate(
        self,
        position: Position,
        now: float,
        feed_age_s: float,
        vol_samples: int,
        realized_today: float,
    ) -> str | None:
        """Reason to block new orders, or None if trading is allowed."""
        if self.kill_file and self.kill_file.exists():
            return f"kill switch ({self.kill_file})"
        if realized_today <= -self.cfg.max_daily_loss:
            return "daily loss limit reached"
        if position.ticker in self.halted_markets:
            return "market halted after an order error"
        if feed_age_s > self.cfg.max_feed_staleness_s:
            return f"price feed stale ({feed_age_s:.1f}s)"
        if vol_samples < self.cfg.min_vol_samples:
            return f"volatility warming up ({vol_samples}/{self.cfg.min_vol_samples} samples)"
        if position.orders >= self.cfg.max_orders_per_market:
            return "max orders for this market"
        if now - position.last_order_ts < self.cfg.order_cooldown_s:
            return "order cooldown"
        return None
