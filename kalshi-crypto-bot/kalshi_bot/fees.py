"""Kalshi trading fees for quadratic-fee series.

Taker fee = 0.07 * multiplier * contracts * P * (1 - P). Series with fee_type
`quadratic` charge makers nothing; `quadratic_with_maker_fees` charges makers
0.0175 * multiplier * C * P * (1 - P). The 15-minute crypto series use
`quadratic` with multiplier 1.
"""

from __future__ import annotations

import math

TAKER_RATE = 0.07
MAKER_RATE = 0.0175
# Non-direct members' balances align to whole cents; Kalshi rounds the
# per-order fee up to that precision (with a rebate accumulator we ignore,
# which keeps this estimate conservative).
BALANCE_PRECISION = 0.01


def fee_rate(maker: bool = False, fee_type: str = "quadratic", multiplier: float = 1.0) -> float:
    if fee_type == "quadratic":
        return 0.0 if maker else TAKER_RATE * multiplier
    if fee_type in ("quadratic_with_maker_fees", "quadratic_with_combo_maker_fees"):
        return (MAKER_RATE if maker else TAKER_RATE) * multiplier
    raise ValueError(f"Unsupported fee_type {fee_type!r}")


def fee_per_contract(price: float, maker: bool = False, fee_type: str = "quadratic", multiplier: float = 1.0) -> float:
    return fee_rate(maker, fee_type, multiplier) * price * (1 - price)


def order_fee(
    count: float, price: float, maker: bool = False, fee_type: str = "quadratic", multiplier: float = 1.0
) -> float:
    raw = count * fee_per_contract(price, maker, fee_type, multiplier)
    if raw <= 0:
        return 0.0
    return math.ceil(raw / BALANCE_PRECISION - 1e-9) * BALANCE_PRECISION


def sweep_fee(fills: list[tuple[float, float]], **kwargs) -> float:
    """Fee for one order that fills across several (price, count) levels."""
    raw = sum(c * fee_per_contract(p, **kwargs) for p, c in fills)
    if raw <= 0:
        return 0.0
    return math.ceil(raw / BALANCE_PRECISION - 1e-9) * BALANCE_PRECISION
