"""Kalshi's `cfbenchmarks_value` WebSocket channel: the settlement index itself."""

from __future__ import annotations

import asyncio
import json
import logging
import time

import websockets

from ..assets import Asset
from ..kalshi.auth import Signer
from ..kalshi.client import WS_URLS
from .base import PriceFeed

log = logging.getLogger(__name__)

WS_SIGN_PATH = "/trade-api/ws/v2"


def parse_cfb_message(message: dict) -> tuple[str, float, float] | None:
    """Return (index_id, ts_seconds, value) from a cfbenchmarks_value message."""
    if message.get("type") != "cfbenchmarks_value":
        return None
    msg = message.get("msg") or {}
    index_id = msg.get("index_id")
    try:
        frame = json.loads(msg.get("data") or "{}")
        value = float(frame["value"])
        ts_ms = frame.get("time") or msg.get("received_at")
    except (ValueError, KeyError, TypeError):
        return None
    if not index_id or not ts_ms:
        return None
    return index_id, float(ts_ms) / 1000.0, value


class KalshiCFBenchmarksFeed(PriceFeed):
    name = "kalshi_cfb"
    is_settlement_index = True

    def __init__(self, assets: list[Asset], signer: Signer, env: str = "prod", **kwargs):
        super().__init__(assets, **kwargs)
        self.signer = signer
        self.url = WS_URLS[env]
        self._by_index = {a.cfb_index: a.symbol for a in assets}

    def _run(self) -> None:
        asyncio.run(self._main())

    async def _main(self) -> None:
        backoff = 1.0
        while not self._stop.is_set():
            try:
                await self._session()
                backoff = 1.0
            except Exception as exc:
                log.warning("CF Benchmarks feed disconnected: %s; reconnecting in %.0fs", exc, backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30.0)

    async def _session(self) -> None:
        headers = self.signer.headers("GET", WS_SIGN_PATH)
        async with websockets.connect(self.url, additional_headers=headers, open_timeout=10) as ws:
            await ws.send(
                json.dumps(
                    {
                        "id": 1,
                        "cmd": "subscribe",
                        "params": {"channels": ["cfbenchmarks_value"], "index_ids": list(self._by_index)},
                    }
                )
            )
            log.info("Subscribed to CF Benchmarks indices %s", list(self._by_index))
            while not self._stop.is_set():
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                message = json.loads(raw)
                if message.get("type") == "error":
                    log.error("CF Benchmarks feed error: %s", message)
                    continue
                parsed = parse_cfb_message(message)
                if parsed:
                    index_id, ts, value = parsed
                    symbol = self._by_index.get(index_id)
                    if symbol:
                        self._on_tick(symbol, min(ts, time.time()), value)
