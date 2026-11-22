"""Minimal Kalshi Trade API v2 REST client."""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any, Iterator
from urllib.parse import urlparse

import requests

from .auth import Signer

log = logging.getLogger(__name__)

REST_URLS = {
    "prod": "https://external-api.kalshi.com/trade-api/v2",
    "demo": "https://external-api.demo.kalshi.co/trade-api/v2",
}
WS_URLS = {
    "prod": "wss://external-api-ws.kalshi.com/trade-api/ws/v2",
    "demo": "wss://external-api-ws.demo.kalshi.co/trade-api/ws/v2",
}

RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class KalshiAPIError(RuntimeError):
    def __init__(self, status: int, body: Any, method: str, path: str):
        self.status = status
        self.body = body
        super().__init__(f"{method} {path} -> HTTP {status}: {body}")


class KalshiClient:
    def __init__(
        self,
        env: str = "prod",
        signer: Signer | None = None,
        session: requests.Session | None = None,
        timeout: float = 5.0,
        max_retries: int = 3,
    ):
        self.base_url = REST_URLS[env]
        self.base_path = urlparse(self.base_url).path
        self.signer = signer
        self.session = session or requests.Session()
        self.timeout = timeout
        self.max_retries = max_retries

    @property
    def authenticated(self) -> bool:
        return self.signer is not None

    def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        body: dict[str, Any] | None = None,
        auth: bool = False,
        retry: bool = True,
    ) -> Any:
        url = self.base_url + path
        attempts = self.max_retries + 1 if retry else 1
        for attempt in range(attempts):
            headers = {"Accept": "application/json"}
            if auth or self.signer:
                if not self.signer:
                    raise RuntimeError(f"{method} {path} requires Kalshi API credentials")
                headers.update(self.signer.headers(method, self.base_path + path))
            try:
                resp = self.session.request(
                    method, url, params=params, json=body, headers=headers, timeout=self.timeout
                )
            except requests.RequestException as exc:
                if attempt + 1 >= attempts:
                    raise
                log.warning("%s %s failed (%s); retrying", method, path, exc)
                time.sleep(0.5 * 2**attempt)
                continue
            if resp.status_code in RETRYABLE_STATUS and attempt + 1 < attempts:
                time.sleep(0.5 * 2**attempt)
                continue
            if resp.status_code >= 400:
                try:
                    payload = resp.json()
                except ValueError:
                    payload = resp.text
                raise KalshiAPIError(resp.status_code, payload, method, path)
            return resp.json() if resp.content else {}
        raise AssertionError("unreachable")

    # Market data (public)

    def get_series(self, series_ticker: str) -> dict:
        return self._request("GET", f"/series/{series_ticker}")["series"]

    def get_markets(self, **params: Any) -> dict:
        return self._request("GET", "/markets", params={k: v for k, v in params.items() if v is not None})

    def iter_markets(self, **params: Any) -> Iterator[dict]:
        cursor = None
        while True:
            page = self.get_markets(cursor=cursor, **params)
            yield from page.get("markets", [])
            cursor = page.get("cursor")
            if not cursor:
                return

    def get_market(self, ticker: str) -> dict:
        return self._request("GET", f"/markets/{ticker}")["market"]

    def get_orderbook(self, ticker: str, depth: int = 10) -> dict:
        return self._request("GET", f"/markets/{ticker}/orderbook", params={"depth": depth})

    def get_candlesticks(
        self, series_ticker: str, ticker: str, start_ts: int, end_ts: int, period_interval: int = 1
    ) -> list[dict]:
        data = self._request(
            "GET",
            f"/series/{series_ticker}/markets/{ticker}/candlesticks",
            params={"start_ts": start_ts, "end_ts": end_ts, "period_interval": period_interval},
        )
        return data.get("candlesticks", [])

    # Portfolio and trading (authenticated)

    def get_balance(self) -> dict:
        return self._request("GET", "/portfolio/balance", auth=True)

    def get_positions(self, **params: Any) -> dict:
        return self._request("GET", "/portfolio/positions", params=params, auth=True)

    def create_order(
        self,
        ticker: str,
        book_side: str,
        count: str,
        price: str,
        time_in_force: str = "immediate_or_cancel",
        client_order_id: str | None = None,
        post_only: bool = False,
    ) -> dict:
        """Create Order (V2). Prices are YES-side: `bid` buys YES, `ask` sells YES (= buys NO)."""
        if book_side not in ("bid", "ask"):
            raise ValueError("book_side must be 'bid' or 'ask'")
        body = {
            "ticker": ticker,
            "client_order_id": client_order_id or str(uuid.uuid4()),
            "side": book_side,
            "count": count,
            "price": price,
            "time_in_force": time_in_force,
            "self_trade_prevention_type": "taker_at_cross",
            "cancel_order_on_pause": True,
            "post_only": post_only,
        }
        # Order creation is not idempotent across retries unless the client_order_id
        # collides, so it is sent exactly once.
        return self._request("POST", "/portfolio/events/orders", body=body, auth=True, retry=False)

    def cancel_order(self, order_id: str, ticker: str) -> dict:
        return self._request(
            "DELETE", f"/portfolio/events/orders/{order_id}", params={"market_ticker": ticker}, auth=True
        )
