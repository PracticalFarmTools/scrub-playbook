"""Parsed Kalshi market, price grid, and order book types."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

# Prices are handled internally as integer units of $0.0001 so grid math is exact.
PRICE_UNITS = 10_000


def to_units(price: float | str) -> int:
    return int(round(float(price) * PRICE_UNITS))


def from_units(units: int) -> float:
    return units / PRICE_UNITS


def format_price(price: float) -> str:
    return f"{from_units(to_units(price)):.4f}"


def format_count(count: float) -> str:
    return f"{math.floor(count * 100 + 1e-9) / 100:.2f}"


def parse_ts(value: str | None) -> float | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


@dataclass(frozen=True)
class PriceGrid:
    """Valid prices from a market's `price_ranges`, as (start, end, step) in price units."""

    bands: tuple[tuple[int, int, int], ...]

    @classmethod
    def from_api(cls, ranges: list[dict] | None) -> "PriceGrid":
        if not ranges:
            return cls(((0, PRICE_UNITS, 100),))
        return cls(tuple((to_units(r["start"]), to_units(r["end"]), to_units(r["step"])) for r in ranges))

    def _band(self, units: int) -> tuple[int, int, int]:
        for band in self.bands:
            if band[0] <= units <= band[1]:
                return band
        raise ValueError(f"price {from_units(units)} outside grid")

    def is_valid(self, price: float) -> bool:
        units = to_units(price)
        for start, end, step in self.bands:
            if start <= units <= end and (units - start) % step == 0:
                return True
        return False

    def snap_down(self, price: float) -> float:
        units = min(max(to_units(price), 0), PRICE_UNITS)
        start, _, step = self._band(units)
        return from_units(start + (units - start) // step * step)

    def snap_up(self, price: float) -> float:
        units = min(max(to_units(price), 0), PRICE_UNITS)
        start, end, step = self._band(units)
        snapped = start + -(-(units - start) // step) * step
        return from_units(min(snapped, end))


@dataclass
class Market:
    ticker: str
    event_ticker: str
    series: str
    status: str
    open_ts: float
    close_ts: float
    strike: float | None
    strike_type: str
    grid: PriceGrid
    result: str = ""
    expiration_value: float | None = None
    raw: dict[str, Any] = field(default_factory=dict, repr=False)

    @classmethod
    def from_api(cls, data: dict[str, Any]) -> "Market":
        exp = data.get("expiration_value")
        return cls(
            ticker=data["ticker"],
            event_ticker=data.get("event_ticker", ""),
            series=data.get("event_ticker", data["ticker"]).split("-")[0],
            status=data.get("status", ""),
            open_ts=parse_ts(data.get("open_time")) or 0.0,
            close_ts=parse_ts(data.get("close_time")) or 0.0,
            strike=float(data["floor_strike"]) if data.get("floor_strike") is not None else None,
            strike_type=data.get("strike_type", "greater_or_equal"),
            grid=PriceGrid.from_api(data.get("price_ranges")),
            result=data.get("result") or "",
            expiration_value=float(exp) if exp not in (None, "") else None,
            raw=data,
        )

    @property
    def is_settled(self) -> bool:
        return self.result in ("yes", "no")

    def seconds_to_close(self, now: float) -> float:
        return self.close_ts - now

    def seconds_since_open(self, now: float) -> float:
        return now - self.open_ts


Level = tuple[float, float]  # (price, size in contracts)


@dataclass
class OrderBook:
    """Kalshi books are bids only: a NO bid at q is a YES ask at 1 - q."""

    yes_bids: list[Level]  # best (highest) first
    no_bids: list[Level]
    ts: float = 0.0

    @classmethod
    def from_api(cls, data: dict[str, Any], ts: float = 0.0) -> "OrderBook":
        book = data.get("orderbook_fp") or data.get("orderbook") or {}

        def parse(levels):
            out = [(float(p), float(s)) for p, s in (levels or []) if float(s) > 0]
            return sorted(out, key=lambda lv: -lv[0])

        yes = book.get("yes_dollars", book.get("yes"))
        no = book.get("no_dollars", book.get("no"))
        return cls(parse(yes), parse(no), ts)

    def best_bid(self, side: str) -> float | None:
        levels = self.yes_bids if side == "yes" else self.no_bids
        return levels[0][0] if levels else None

    def asks(self, side: str) -> list[Level]:
        """Ask levels for buying `side`, cheapest first."""
        opposite = self.no_bids if side == "yes" else self.yes_bids
        return [(from_units(PRICE_UNITS - to_units(p)), s) for p, s in opposite]

    def best_ask(self, side: str) -> float | None:
        asks = self.asks(side)
        return asks[0][0] if asks else None

    def yes_mid(self) -> float | None:
        bid, ask = self.best_bid("yes"), self.best_ask("yes")
        if bid is None or ask is None:
            return None
        return (bid + ask) / 2

    def yes_spread(self) -> float | None:
        bid, ask = self.best_bid("yes"), self.best_ask("yes")
        if bid is None or ask is None:
            return None
        return ask - bid
