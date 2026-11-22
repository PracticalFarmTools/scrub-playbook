"""Proxy for the CF Benchmarks index from public exchange tickers (no credentials).

Coinbase, Kraken and Bitstamp are all BRTI constituent exchanges. Their median
mid tracks the index to within a few basis points; the engine removes the
remaining offset with a basis estimated from each market's strike.
"""

from __future__ import annotations

import logging
import statistics
import time
from concurrent.futures import ThreadPoolExecutor

import requests

from ..assets import Asset
from .base import PriceFeed

log = logging.getLogger(__name__)


class PublicExchangeFeed(PriceFeed):
    name = "public"
    is_settlement_index = False

    def __init__(self, assets: list[Asset], interval_s: float = 1.0, max_quote_age_s: float = 4.0, **kwargs):
        usable = [a for a in assets if a.has_public_proxy]
        skipped = sorted(set(a.symbol for a in assets) - set(a.symbol for a in usable))
        if skipped:
            log.warning("No public price proxy for %s; those assets need the Kalshi CF Benchmarks feed", skipped)
        super().__init__(usable, **kwargs)
        self.interval_s = interval_s
        self.max_quote_age_s = max_quote_age_s
        self.session = requests.Session()
        self._quotes: dict[tuple[str, str], tuple[float, float]] = {}
        self._pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="quotes")
        self._last_kraken = 0.0

    def _coinbase(self, asset: Asset) -> list[tuple[str, str, float]]:
        r = self.session.get(f"https://api.exchange.coinbase.com/products/{asset.coinbase}/ticker", timeout=3)
        r.raise_for_status()
        d = r.json()
        return [("coinbase", asset.symbol, (float(d["bid"]) + float(d["ask"])) / 2)]

    def _bitstamp(self, asset: Asset) -> list[tuple[str, str, float]]:
        r = self.session.get(f"https://www.bitstamp.net/api/v2/ticker/{asset.bitstamp}/", timeout=3)
        r.raise_for_status()
        d = r.json()
        return [("bitstamp", asset.symbol, (float(d["bid"]) + float(d["ask"])) / 2)]

    def _kraken(self, assets: list[Asset]) -> list[tuple[str, str, float]]:
        pairs = ",".join(a.kraken for a in assets)
        r = self.session.get("https://api.kraken.com/0/public/Ticker", params={"pair": pairs}, timeout=3)
        r.raise_for_status()
        result = r.json().get("result", {})
        out = []
        for a in assets:
            d = result.get(a.kraken_result_key) or result.get(a.kraken)
            if d:
                out.append(("kraken", a.symbol, (float(d["a"][0]) + float(d["b"][0])) / 2))
        return out

    def poll_once(self) -> None:
        now = time.time()
        jobs = []
        assets = [s.asset for s in self.states.values()]
        for a in assets:
            if a.coinbase:
                jobs.append(self._pool.submit(self._coinbase, a))
            if a.bitstamp:
                jobs.append(self._pool.submit(self._bitstamp, a))
        # Kraken's public limit is about one call per second, so all pairs share one call.
        kraken_assets = [a for a in assets if a.kraken]
        if kraken_assets and now - self._last_kraken >= 2.0:
            self._last_kraken = now
            jobs.append(self._pool.submit(self._kraken, kraken_assets))

        for job in jobs:
            try:
                for venue, symbol, mid in job.result(timeout=4):
                    self._quotes[(venue, symbol)] = (now, mid)
            except Exception as exc:  # one venue failing must not stop the feed
                log.debug("quote poll failed: %s", exc)

        stamp = time.time()
        for symbol in self.states:
            fresh = [
                mid
                for (venue, sym), (ts, mid) in self._quotes.items()
                if sym == symbol and stamp - ts <= self.max_quote_age_s
            ]
            if fresh:
                self._on_tick(symbol, stamp, statistics.median(fresh))

    def _run(self) -> None:
        while not self._stop.is_set():
            started = time.time()
            self.poll_once()
            self._stop.wait(max(0.0, self.interval_s - (time.time() - started)))
