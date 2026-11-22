"""SQLite journal of fills and settlements; the source of truth for PnL and risk."""

from __future__ import annotations

import sqlite3
import threading
from dataclasses import dataclass
from pathlib import Path

from .positions import Position

SCHEMA = """
CREATE TABLE IF NOT EXISTS fills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts REAL NOT NULL,
    asset TEXT NOT NULL,
    ticker TEXT NOT NULL,
    close_ts REAL NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
    count REAL NOT NULL,
    price REAL NOT NULL,
    fee REAL NOT NULL,
    order_id TEXT,
    fair_prob REAL,
    model_prob REAL,
    edge REAL,
    spot REAL,
    strike REAL
);
CREATE INDEX IF NOT EXISTS fills_ticker ON fills (ticker);
CREATE TABLE IF NOT EXISTS settlements (
    ticker TEXT PRIMARY KEY,
    ts REAL NOT NULL,
    asset TEXT NOT NULL,
    result TEXT NOT NULL,
    expiration_value REAL,
    payout REAL NOT NULL,
    cost REAL NOT NULL,
    fees REAL NOT NULL,
    pnl REAL NOT NULL
);
"""


@dataclass
class FillRecord:
    ts: float
    asset: str
    ticker: str
    close_ts: float
    side: str
    count: float
    price: float
    fee: float
    order_id: str | None = None
    fair_prob: float | None = None
    model_prob: float | None = None
    edge: float | None = None
    spot: float | None = None
    strike: float | None = None


class Ledger:
    def __init__(self, path: str | Path):
        path = Path(path)
        if str(path) != ":memory:":
            path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._conn.executescript(SCHEMA)

    def record_fill(self, f: FillRecord) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT INTO fills (ts, asset, ticker, close_ts, side, count, price, fee, order_id,"
                " fair_prob, model_prob, edge, spot, strike) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    f.ts, f.asset, f.ticker, f.close_ts, f.side, f.count, f.price, f.fee, f.order_id,
                    f.fair_prob, f.model_prob, f.edge, f.spot, f.strike,
                ),
            )

    def open_positions(self) -> dict[str, Position]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM fills WHERE ticker NOT IN (SELECT ticker FROM settlements) ORDER BY id"
            ).fetchall()
        positions: dict[str, Position] = {}
        for r in rows:
            pos = positions.get(r["ticker"]) or Position(r["ticker"], r["asset"], r["close_ts"])
            pos = pos.with_fill(r["side"], r["count"], r["price"], r["fee"])
            pos.orders += 1
            pos.last_order_ts = max(pos.last_order_ts, r["ts"])
            positions[r["ticker"]] = pos
        return positions

    def record_settlement(self, pos: Position, result: str, ts: float, expiration_value: float | None) -> float:
        payout = pos.payout(result)
        pnl = payout - pos.cost
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT OR IGNORE INTO settlements (ticker, ts, asset, result, expiration_value, payout, cost, fees, pnl)"
                " VALUES (?,?,?,?,?,?,?,?,?)",
                (pos.ticker, ts, pos.asset, result, expiration_value, payout, pos.cost, pos.fees, pnl),
            )
        return pnl

    def realized_pnl(self, since_ts: float = 0.0) -> float:
        with self._lock:
            row = self._conn.execute("SELECT COALESCE(SUM(pnl), 0) FROM settlements WHERE ts >= ?", (since_ts,)).fetchone()
        return float(row[0])

    def summary(self) -> dict:
        with self._lock:
            s = self._conn.execute(
                "SELECT COUNT(*) n, COALESCE(SUM(pnl),0) pnl, COALESCE(SUM(fees),0) fees,"
                " COALESCE(SUM(cost),0) cost, COALESCE(SUM(pnl > 0),0) wins FROM settlements"
            ).fetchone()
            by_asset = self._conn.execute(
                "SELECT asset, COUNT(*) n, SUM(pnl) pnl, SUM(pnl > 0) wins FROM settlements GROUP BY asset ORDER BY asset"
            ).fetchall()
            fills = self._conn.execute("SELECT COUNT(*) FROM fills").fetchone()[0]
        return {
            "settled_markets": s["n"],
            "wins": s["wins"],
            "pnl": s["pnl"],
            "fees": s["fees"],
            "capital_deployed": s["cost"],
            "fills": fills,
            "by_asset": [dict(r) for r in by_asset],
        }

    def recent_settlements(self, limit: int = 20) -> list[dict]:
        with self._lock:
            rows = self._conn.execute("SELECT * FROM settlements ORDER BY ts DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
