import base64
import json

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ed25519, padding, rsa

from kalshi_bot.execution import LiveExecutor, PaperExecutor
from kalshi_bot.feeds.kalshi_cfb import parse_cfb_message
from kalshi_bot.kalshi.auth import Signer, load_private_key
from kalshi_bot.kalshi.client import KalshiAPIError
from kalshi_bot.strategy import Signal


def _pem(key) -> str:
    return key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()


def test_rsa_signature_verifies_and_ignores_query():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    signer = Signer("key-id", load_private_key(pem=_pem(key)))
    headers = signer.headers("get", "/trade-api/v2/portfolio/orders?limit=5", timestamp_ms=1703123456789)
    assert headers["KALSHI-ACCESS-KEY"] == "key-id"
    assert headers["KALSHI-ACCESS-TIMESTAMP"] == "1703123456789"
    key.public_key().verify(
        base64.b64decode(headers["KALSHI-ACCESS-SIGNATURE"]),
        b"1703123456789GET/trade-api/v2/portfolio/orders",
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.DIGEST_LENGTH),
        hashes.SHA256(),
    )


def test_ed25519_signature_and_pem_from_env_with_escaped_newlines(tmp_path):
    key = ed25519.Ed25519PrivateKey.generate()
    escaped = _pem(key).replace("\n", "\\n")
    signer = Signer("k", load_private_key(pem=escaped))
    headers = signer.headers("POST", "/trade-api/v2/portfolio/events/orders", timestamp_ms=1)
    key.public_key().verify(base64.b64decode(headers["KALSHI-ACCESS-SIGNATURE"]), b"1POST/trade-api/v2/portfolio/events/orders")
    path = tmp_path / "k.pem"
    path.write_text(_pem(key))
    assert isinstance(load_private_key(path=str(path)), ed25519.Ed25519PrivateKey)


class FakeClient:
    authenticated = True

    def __init__(self, book=None, order_response=None, order_error=None):
        self.book = book
        self.order_response = order_response
        self.order_error = order_error
        self.orders = []

    def get_orderbook(self, ticker, depth=10):
        return self.book

    def create_order(self, **kwargs):
        self.orders.append(kwargs)
        if self.order_error:
            raise self.order_error
        return self.order_response


def signal(side="yes", limit=0.62, count=20.0):
    return Signal("BTC", "T", side, limit, count, limit, 0.0, 0.8, 0.8, 0.1)


def test_paper_executor_fills_against_fresh_book_up_to_limit():
    book = {"orderbook_fp": {"no_dollars": [["0.4000", "5.00"], ["0.3900", "8.00"], ["0.3500", "100.00"]], "yes_dollars": []}}
    res = PaperExecutor(FakeClient(book)).execute(signal(limit=0.62, count=20))
    assert res.filled == 13
    assert res.avg_price == pytest.approx((0.60 * 5 + 0.61 * 8) / 13)
    assert res.fee == pytest.approx(0.22)  # 0.07 * (5*0.6*0.4 + 8*0.61*0.39) = 0.217
    assert res.order_id.startswith("paper-")


def test_paper_executor_no_fill_when_book_moved_away():
    book = {"orderbook_fp": {"no_dollars": [["0.3000", "50.00"]], "yes_dollars": []}}
    assert PaperExecutor(FakeClient(book)).execute(signal(limit=0.62)).filled == 0


def test_live_executor_maps_no_buys_to_yes_side_asks():
    client = FakeClient(order_response={"order_id": "o1", "fill_count": "10.00", "remaining_count": "0.00",
                                        "average_fill_price": "0.2800", "average_fee_paid": "0.0141", "ts_ms": 1})
    res = LiveExecutor(client).execute(signal(side="no", limit=0.72, count=10))
    order = client.orders[0]
    assert order["book_side"] == "ask" and order["price"] == "0.2800" and order["count"] == "10.00"
    assert order["time_in_force"] == "immediate_or_cancel"
    assert res.filled == 10 and res.avg_price == pytest.approx(0.72) and res.fee == pytest.approx(0.141)


def test_live_executor_yes_buy_and_no_fill():
    client = FakeClient(order_response={"order_id": "o2", "fill_count": "0.00", "remaining_count": "0.00", "ts_ms": 1})
    res = LiveExecutor(client).execute(signal(side="yes", limit=0.55, count=3.5))
    assert client.orders[0]["book_side"] == "bid" and client.orders[0]["price"] == "0.5500"
    assert client.orders[0]["count"] == "3.50"
    assert res.filled == 0 and not res.ambiguous


def test_live_executor_flags_ambiguous_outcomes():
    rejected = LiveExecutor(FakeClient(order_error=KalshiAPIError(400, {"code": "invalid_price"}, "POST", "/x"))).execute(signal())
    assert rejected.filled == 0 and not rejected.ambiguous
    unknown = LiveExecutor(FakeClient(order_error=KalshiAPIError(503, "unavailable", "POST", "/x"))).execute(signal())
    assert unknown.ambiguous
    timeout = LiveExecutor(FakeClient(order_error=TimeoutError("read timeout"))).execute(signal())
    assert timeout.ambiguous


def test_parse_cfb_message():
    msg = {
        "type": "cfbenchmarks_value",
        "sid": 1,
        "seq": 42,
        "msg": {
            "index_id": "BRTI",
            "received_at": 1710000000123,
            "data": json.dumps({"type": "value", "id": "BRTI", "time": 1710000000100, "value": "68000.12"}),
            "avg_60s_data": {"value": "68000.12000000", "window_size": 3, "window_start_ts_ms": 0, "window_end_ts_exclusive": 0},
        },
    }
    assert parse_cfb_message(msg) == ("BRTI", 1710000000.1, 68000.12)
    assert parse_cfb_message({"type": "subscribed"}) is None
    assert parse_cfb_message({"type": "cfbenchmarks_value", "msg": {"index_id": "BRTI", "data": "not json"}}) is None
