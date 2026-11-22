"""Kalshi API key request signing (RSA-PSS/SHA-256 or Ed25519)."""

from __future__ import annotations

import base64
import time

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey


def load_private_key(path: str | None = None, pem: str | None = None):
    if pem:
        data = pem.replace("\\n", "\n").encode()
    elif path:
        with open(path, "rb") as fh:
            data = fh.read()
    else:
        raise ValueError("A private key path or PEM string is required")
    key = serialization.load_pem_private_key(data, password=None)
    if not isinstance(key, (RSAPrivateKey, Ed25519PrivateKey)):
        raise ValueError("Kalshi keys must be RSA or Ed25519")
    return key


class Signer:
    def __init__(self, api_key_id: str, private_key):
        self.api_key_id = api_key_id
        self.private_key = private_key

    def sign(self, message: bytes) -> str:
        if isinstance(self.private_key, Ed25519PrivateKey):
            sig = self.private_key.sign(message)
        else:
            sig = self.private_key.sign(
                message,
                padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.DIGEST_LENGTH),
                hashes.SHA256(),
            )
        return base64.b64encode(sig).decode()

    def headers(self, method: str, path: str, timestamp_ms: int | None = None) -> dict[str, str]:
        """`path` is the full URL path from the host root, e.g. /trade-api/v2/portfolio/balance."""
        ts = str(timestamp_ms if timestamp_ms is not None else int(time.time() * 1000))
        message = f"{ts}{method.upper()}{path.split('?')[0]}".encode()
        return {
            "KALSHI-ACCESS-KEY": self.api_key_id,
            "KALSHI-ACCESS-TIMESTAMP": ts,
            "KALSHI-ACCESS-SIGNATURE": self.sign(message),
        }
