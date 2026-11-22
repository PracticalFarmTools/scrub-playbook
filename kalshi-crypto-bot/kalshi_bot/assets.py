"""Coins with a Kalshi 15-minute up/down series, and where to price them."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Asset:
    symbol: str
    series: str
    cfb_index: str
    coinbase: str | None = None
    kraken: str | None = None
    kraken_result_key: str | None = None
    bitstamp: str | None = None

    @property
    def has_public_proxy(self) -> bool:
        return any((self.coinbase, self.kraken, self.bitstamp))


# Kraken returns results under legacy keys (XXBTZUSD etc.), so both are stored.
ASSETS: dict[str, Asset] = {
    a.symbol: a
    for a in [
        Asset("BTC", "KXBTC15M", "BRTI", "BTC-USD", "XBTUSD", "XXBTZUSD", "btcusd"),
        Asset("ETH", "KXETH15M", "ETHUSD_RTI", "ETH-USD", "ETHUSD", "XETHZUSD", "ethusd"),
        Asset("SOL", "KXSOL15M", "SOLUSD_RTI", "SOL-USD", "SOLUSD", "SOLUSD", "solusd"),
        Asset("XRP", "KXXRP15M", "XRPUSD_RTI", "XRP-USD", "XRPUSD", "XXRPZUSD", "xrpusd"),
        Asset("DOGE", "KXDOGE15M", "DOGEUSD_RTI", "DOGE-USD", "XDGUSD", "XDGUSD", "dogeusd"),
        Asset("BNB", "KXBNB15M", "BNBUSD_RTI"),
        Asset("HYPE", "KXHYPE15M", "HYPEUSD_RTI"),
        Asset("ADA", "KXADA15M", "ADAUSD_RTI", "ADA-USD", "ADAUSD", "ADAUSD", "adausd"),
        Asset("BCH", "KXBCH15M", "BCHUSD_RTI", "BCH-USD", "BCHUSD", "BCHUSD", "bchusd"),
        Asset("NEAR", "KXNEAR15M", "NEARUSD_RTI", "NEAR-USD"),
        Asset("TON", "KXTON15M", "TONUSD_RTI"),
        Asset("ZEC", "KXZEC15M", "ZECUSD_RTI", "ZEC-USD"),
    ]
}


def get_asset(symbol: str) -> Asset:
    try:
        return ASSETS[symbol.upper()]
    except KeyError:
        raise ValueError(f"Unknown asset {symbol!r}; choose from {', '.join(ASSETS)}") from None
