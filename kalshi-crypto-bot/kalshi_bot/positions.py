"""Per-market position accounting."""

from __future__ import annotations

from dataclasses import dataclass, replace


@dataclass
class Position:
    ticker: str
    asset: str = ""
    close_ts: float = 0.0
    yes_count: float = 0.0
    no_count: float = 0.0
    # Premiums paid plus fees, in dollars.
    cost: float = 0.0
    fees: float = 0.0
    orders: int = 0
    last_order_ts: float = 0.0

    @property
    def is_flat(self) -> bool:
        return self.yes_count == 0 and self.no_count == 0

    def payout(self, result: str) -> float:
        # A YES+NO pair always pays $1, so holding both sides needs no netting.
        if result == "yes":
            return self.yes_count
        if result == "no":
            return self.no_count
        raise ValueError(f"unknown result {result!r}")

    def worst_case_loss(self) -> float:
        return max(self.cost - self.yes_count, self.cost - self.no_count, 0.0)

    def with_fill(self, side: str, count: float, price: float, fee: float) -> "Position":
        if side == "yes":
            return replace(self, yes_count=self.yes_count + count, cost=self.cost + count * price + fee, fees=self.fees + fee)
        if side == "no":
            return replace(self, no_count=self.no_count + count, cost=self.cost + count * price + fee, fees=self.fees + fee)
        raise ValueError(f"unknown side {side!r}")
