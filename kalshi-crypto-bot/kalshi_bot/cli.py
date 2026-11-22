"""Command-line entry point: python -m kalshi_bot <command>."""

from __future__ import annotations

import argparse
import logging
import math
import signal
import sys
import time
from pathlib import Path

import requests

from .assets import get_asset
from .backtest import run_backtest
from .config import BotConfig, annual_vol_to_per_second, load_config
from .engine import Engine
from .execution import LiveExecutor, PaperExecutor
from .feeds.base import PriceFeed
from .feeds.kalshi_cfb import KalshiCFBenchmarksFeed
from .feeds.public_exchanges import PublicExchangeFeed
from .kalshi.auth import Signer, load_private_key
from .kalshi.client import KalshiClient
from .ledger import Ledger
from .markets import Market, OrderBook
from .pricing import prob_yes, var_per_s_from_closes
from .risk import RiskManager

log = logging.getLogger("kalshi_bot")


def setup_logging(cfg: BotConfig | None, verbose: bool = False) -> None:
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    if cfg is not None:
        Path(cfg.data_dir).mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(Path(cfg.data_dir) / f"bot-{cfg.mode}.log"))
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-5s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
        force=True,
    )
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("websockets").setLevel(logging.WARNING)


def build_signer(cfg: BotConfig) -> Signer | None:
    if not cfg.has_credentials:
        return None
    return Signer(cfg.api_key_id, load_private_key(cfg.private_key_path, cfg.private_key_pem))


def build_feed(cfg: BotConfig, signer: Signer | None) -> PriceFeed:
    assets = [get_asset(s) for s in cfg.assets]
    source = cfg.price_source
    if source == "auto":
        source = "kalshi_cfb" if signer else "public"
    kwargs = {"vol_halflife_s": cfg.strategy.vol_halflife_s, "vol_sample_s": cfg.strategy.vol_sample_s}
    if source == "kalshi_cfb":
        if signer is None:
            raise SystemExit("price_source=kalshi_cfb needs Kalshi API credentials")
        return KalshiCFBenchmarksFeed(assets, signer, cfg.env, **kwargs)
    return PublicExchangeFeed(assets, **kwargs)


def cmd_trade(args: argparse.Namespace) -> int:
    cfg = load_config(args.config, mode=args.command, assets=_assets_arg(args.assets))
    setup_logging(cfg, args.verbose)

    if cfg.mode == "live":
        if not args.confirm_live:
            log.error("Live mode places real orders. Re-run with --confirm-live once you have paper-traded.")
            return 2
        if cfg.env == "prod":
            log.warning("LIVE TRADING ON PRODUCTION with real money")

    signer = build_signer(cfg)
    client = KalshiClient(cfg.env, signer)
    feed = build_feed(cfg, signer)
    ledger = Ledger(cfg.db_path)
    risk = RiskManager(cfg.risk, cfg.timezone, Path(cfg.data_dir) / "KILL")

    balance_fn = None
    if cfg.mode == "live":
        executor = LiveExecutor(client)
        balance = client.get_balance()
        log.info("Kalshi balance: $%s", balance.get("balance_dollars"))
        balance_fn = lambda: float(client.get_balance().get("balance_dollars", 0))  # noqa: E731
        _warn_external_positions(client, cfg, ledger)
    else:
        executor = PaperExecutor(client)

    log.info(
        "Starting %s trading on %s (%s) for %s using %s prices; ledger %s",
        cfg.mode,
        cfg.env,
        client.base_url,
        ", ".join(cfg.assets),
        feed.name,
        cfg.db_path,
    )
    feed.bootstrap_vol()
    feed.start()
    engine = Engine(cfg, client, feed, executor, ledger, risk, balance_fn=balance_fn)

    def handle_stop(signum, frame):
        log.info("Stopping after this tick")
        engine.stop()

    signal.signal(signal.SIGINT, handle_stop)
    signal.signal(signal.SIGTERM, handle_stop)
    time.sleep(2.0)  # let the feed land its first ticks
    try:
        engine.run(duration_s=args.minutes * 60 if args.minutes else None)
    finally:
        feed.stop()
        _print_summary(ledger)
    return 0


def _warn_external_positions(client: KalshiClient, cfg: BotConfig, ledger: Ledger) -> None:
    series = {get_asset(s).series for s in cfg.assets}
    known = set(ledger.open_positions())
    try:
        data = client.get_positions(count_filter="position", limit=200)
    except Exception as exc:
        log.warning("Could not check existing positions: %s", exc)
        return
    for p in data.get("market_positions", []):
        ticker = p.get("ticker", "")
        if ticker.split("-")[0] in series and ticker not in known:
            log.warning(
                "Existing position in %s (%s contracts) is not in the bot ledger and is not counted by its risk limits",
                ticker,
                p.get("position_fp"),
            )


def _print_summary(ledger: Ledger) -> None:
    s = ledger.summary()
    open_pos = ledger.open_positions()
    print("\n=== Ledger summary ===")
    print(f"Fills: {s['fills']}  Settled markets: {s['settled_markets']}  Wins: {s['wins']}")
    print(f"Realized PnL: ${s['pnl']:+.2f}  Fees: ${s['fees']:.2f}  Capital deployed: ${s['capital_deployed']:.2f}")
    for row in s["by_asset"]:
        print(f"  {row['asset']:<5} markets {row['n']:4d}  wins {row['wins']:4d}  PnL ${row['pnl']:+.2f}")
    if open_pos:
        print("Open (unsettled) positions:")
        for p in open_pos.values():
            print(f"  {p.ticker}: {p.yes_count:g} YES / {p.no_count:g} NO, cost ${p.cost:.2f}, worst case -${p.worst_case_loss():.2f}")


def cmd_report(args: argparse.Namespace) -> int:
    cfg = load_config(args.config, mode=args.mode)
    ledger = Ledger(cfg.db_path)
    _print_summary(ledger)
    recent = ledger.recent_settlements(args.limit)
    if recent:
        print(f"\nLast {len(recent)} settlements:")
        for r in recent:
            when = time.strftime("%Y-%m-%d %H:%M", time.localtime(r["ts"]))
            print(f"  {when} {r['ticker']:<28} {r['result'].upper():<3} cost ${r['cost']:.2f} payout ${r['payout']:.2f} PnL {r['pnl']:+.2f}")
    return 0


def cmd_markets(args: argparse.Namespace) -> int:
    """One-shot view of the live markets with the model's fair value."""
    cfg = load_config(args.config, assets=_assets_arg(args.assets))
    setup_logging(None, args.verbose)
    client = KalshiClient(cfg.env)
    session = requests.Session()
    now = time.time()
    min_sigma = annual_vol_to_per_second(cfg.strategy.min_annual_vol)
    print(f"{'asset':<5} {'market':<28} {'left':>5} {'strike':>12} {'spot':>12} {'vol':>5} {'model':>6} {'bid':>6} {'ask':>6}")
    for symbol in cfg.assets:
        asset = get_asset(symbol)
        markets = [Market.from_api(m) for m in client.get_markets(series_ticker=asset.series, status="open").get("markets", [])]
        markets = [m for m in markets if m.open_ts <= now < m.close_ts]
        if not markets:
            print(f"{symbol:<5} no open market")
            continue
        m = markets[0]
        book = OrderBook.from_api(client.get_orderbook(m.ticker))
        spot = sigma = model = None
        if asset.coinbase and m.strike is not None:
            rows = session.get(
                f"https://api.exchange.coinbase.com/products/{asset.coinbase}/candles", params={"granularity": 60}, timeout=5
            ).json()
            candles = {int(r[0]): r for r in rows}
            tick = session.get(f"https://api.exchange.coinbase.com/products/{asset.coinbase}/ticker", timeout=5).json()
            anchor = candles.get(int(m.open_ts) - 60)
            basis = m.strike - sum(float(x) for x in anchor[1:5]) / 4 if anchor else 0.0
            spot = (float(tick["bid"]) + float(tick["ask"])) / 2 + basis
            closes = [float(r[4]) for r in sorted(rows, key=lambda r: r[0])[-61:]]
            var = var_per_s_from_closes(closes, 60.0) or 0.0
            sigma = max(math.sqrt(var) * cfg.strategy.vol_multiplier, min_sigma)
            model = prob_yes(m.strike, m.close_ts - now, spot, sigma)
        left = int(m.close_ts - now)
        vol_pct = sigma * (365 * 24 * 3600) ** 0.5 * 100 if sigma else None

        def f(x, width, fmt):
            return format(x, f">{width}{fmt}") if x is not None else "-".rjust(width)

        print(
            f"{symbol:<5} {m.ticker:<28} {left // 60:02d}:{left % 60:02d} {f(m.strike, 12, '.6g')} {f(spot, 12, '.6g')}"
            f" {f(vol_pct, 4, '.0f')}% {f(model, 6, '.3f')}"
            f" {f(book.best_bid('yes'), 6, '.3f')} {f(book.best_ask('yes'), 6, '.3f')}"
        )
    return 0


def cmd_backtest(args: argparse.Namespace) -> int:
    cfg = load_config(args.config, assets=_assets_arg(args.assets))
    setup_logging(None, args.verbose)
    sweep = [float(x) for x in args.vol_sweep.split(",")] if args.vol_sweep else None
    run_backtest(cfg, cfg.assets, args.days, depth=args.depth, csv_path=args.csv, vol_sweep=sweep)
    return 0


def _assets_arg(value: str | None) -> list[str] | None:
    return [a.strip().upper() for a in value.split(",") if a.strip()] if value else None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="kalshi_bot", description="Kalshi 15-minute crypto market bot")
    parser.add_argument("-c", "--config", help="TOML config file (see config.example.toml)")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    for name, help_text in (("paper", "simulate trading against live markets"), ("live", "trade with real orders")):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("--assets", help="comma-separated, e.g. BTC,ETH,SOL")
        p.add_argument("--minutes", type=float, help="stop after this many minutes")
        if name == "live":
            p.add_argument("--confirm-live", action="store_true", help="required to place real orders")
        p.set_defaults(func=cmd_trade, confirm_live=False)

    p = sub.add_parser("markets", help="show open 15-minute markets with model fair value")
    p.add_argument("--assets")
    p.set_defaults(func=cmd_markets)

    p = sub.add_parser("backtest", help="replay the strategy on recently settled markets")
    p.add_argument("--assets")
    p.add_argument("--days", type=float, default=1.0)
    p.add_argument("--depth", type=float, default=50.0, help="contracts assumed available at each quote")
    p.add_argument("--csv", help="write trades to this CSV file")
    p.add_argument("--vol-sweep", help="re-score the model at these vol multipliers, e.g. 0.7,0.85,1.0")
    p.set_defaults(func=cmd_backtest)

    p = sub.add_parser("report", help="summarize the paper or live ledger")
    p.add_argument("--mode", choices=["paper", "live"], default="paper")
    p.add_argument("--limit", type=int, default=20)
    p.set_defaults(func=cmd_report)

    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
