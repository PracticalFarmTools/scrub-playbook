# Kalshi 15-Minute Crypto Bot

A trading bot for Kalshi's 15-minute crypto "up or down" markets (`KXBTC15M`,
`KXETH15M`, `KXSOL15M`, `KXXRP15M`, `KXDOGE15M`, and the smaller coins). It
prices every contract from first principles, compares that to the order book,
and takes liquidity only when the expected profit after fees clears a threshold,
under hard risk limits. It runs in **paper** mode against live markets without
any credentials, and in **live** mode against Kalshi's demo or production API.

> Trading binary event contracts can lose your whole stake quickly. Nothing here
> is financial advice, and the backtest section explains why its numbers are an
> upper bound. Paper-trade first, then use Kalshi's demo environment, then
> small size.

## How these markets work

Each coin has one market per quarter hour (opening at :00, :15, :30, :45 ET).
The title is "BTC price up in next 15 mins?". From the contract rules:

* **Strike** = the simple average of the 60 one-second values of the CF
  Benchmarks Real-Time Index (BRTI for bitcoin, `ETHUSD_RTI` etc.) in the minute
  before the window opens. Kalshi publishes it as `floor_strike` at the open.
* **Settlement** = the same 60-second average in the minute before the close.
* YES wins if settlement ≥ strike (ties go to YES). Each contract pays $1.
* Prices sit on a tapered grid: $0.001 ticks below $0.10 and above $0.90, $0.01
  in between. Orders can be fractional down to 0.01 contracts.
* Fees on these series are quadratic and charged to takers only:
  `0.07 × contracts × P × (1 − P)`, rounded up to the cent per order. At 50¢
  that is 1.75¢ per contract; makers pay nothing.

## Strategy

### 1. Fair value of the averaged settlement

The index is modelled as driftless Brownian motion in price, sampled once a
second, with per-second volatility σ·spot. Because settlement is an *average*,
it is less volatile than the spot price at the close:

* More than 60 s before the close (τ seconds left), the settlement average is
  normal with mean = spot and variance σ²·spot²·[(τ − 60) + 61·121/360] — about
  τ − 40 seconds' worth of variance, not τ.
* Inside the final minute, the m ticks already printed are fixed (sum P), and
  r = τ ticks remain: mean = (P + r·spot)/(m + r), variance
  σ²·spot²·r(r+1)(2r+1)/(6(m + r)²).

P(YES) = Φ((mean − strike)/sd). `tests/test_pricing.py` checks both formulas
against a Monte Carlo simulation.

### 2. Volatility

An EWMA of 5-second log returns (half-life 30 min, bias-corrected so warm-up
estimates are true averages), seeded at startup from two hours of Coinbase
1-minute candles. The estimate is multiplied by `vol_multiplier = 0.9`. Below 1
is deliberate: crypto returns are fat-tailed, so a Gaussian with the full
realized variance overrates moderate moves and makes underdogs look cheap. The
backtest's volatility sweep picked 0.9 across five coins (table below).

### 3. Price source and basis

* **Live (recommended):** Kalshi's authenticated `cfbenchmarks_value` WebSocket
  streams the settlement index itself, so there is no basis error.
* **Paper / no credentials:** the median mid of Coinbase, Kraken and Bitstamp
  (all BRTI constituents). The proxy sits a few basis points away from the
  index, which is enough to fake several cents of edge. So at every market open
  the bot measures `basis = strike − proxy average over the same minute` and
  adds it to the proxy for the rest of the window. Until a basis is measured
  (after a cold start), the bot quotes but **does not trade**.

### 4. Blend with the market

The model and the order book are about equally accurate (Brier scores below), so
fair value = 50% model + 50% book mid (`market_blend = 0.5`). The blend beat
both the market and the model in the backtest. It also means the model must
disagree with the market by roughly twice `min_edge` before the bot acts.

### 5. Entry

For each side, walk the ask ladder (YES asks are `1 − NO bids`), cheapest first,
and keep levels while `fair − price − taker fee ≥ min_edge` (4¢). Further
filters:

* trade only between 60 s after the open and 20 s before the close;
* only buy prices between 5¢ and 95¢, where model error does not dominate;
* skip books with a YES spread wider than 8¢.

Orders are immediate-or-cancel at the worst qualifying level, so the bot never
leaves resting orders behind.

### 6. Sizing

Fractional Kelly (`kelly_fraction = 0.15`) on the edge at the best price, capped
by visible depth and by risk room. Risk room uses the exact worst-case loss of
the position after the fill, so buying the opposite side of an existing position
(which locks in a $1 YES+NO pair) correctly frees room instead of using it.
Orders under $2 of premium are skipped.

### 7. Exit

Positions are held to settlement. Selling back pays the spread and the taker
fee again within a 15-minute horizon, and the market settles automatically.

## Risk controls

| Control | Default | Behaviour |
| - | - | - |
| Per-market worst-case loss | $40 | Includes fees; hedged pairs count as locked in |
| Total worst-case loss | $120 | Across all open markets |
| Daily loss limit | $100 | Today's realized loss **plus** open worst case; resets at midnight ET |
| Orders per market / cooldown | 4 / 10 s | Prevents chasing a moving book |
| Stale feed | 5 s | No orders on old prices |
| Volatility warm-up | 20 samples | No orders before the estimate is meaningful |
| Basis guard | on | Proxy feed must be calibrated to the strike |
| Kill switch | `touch data/KILL` | Stops new orders immediately; delete the file to resume |
| Ambiguous order outcome | halt market | A timeout or 5xx on order entry halts that market until you reconcile it on Kalshi |
| Live confirmation | `--confirm-live` | Live mode refuses to start without it |

## Architecture

```
 price feed thread ── ticks ──► PriceHistory + VolEstimator      (feeds/)
   (Kalshi CFB WebSocket, or Coinbase/Kraken/Bitstamp median)
                                     │
 Kalshi REST ── market, book ──► Engine.tick(), 1 Hz per coin    (engine.py)
                                     │ Snapshot
                              strategy.evaluate() ──► Signal     (strategy.py, pricing.py, fees.py)
                                     │
                           RiskManager.gate() / room()           (risk.py)
                                     │
                  PaperExecutor | LiveExecutor (IOC orders)      (execution.py)
                                     │
                         Ledger (SQLite fills, settlements)      (ledger.py, positions.py)
                                     │
                    settlement poller ──► realized PnL
```

| Module | Purpose |
| - | - |
| `kalshi/auth.py` | RSA-PSS / Ed25519 request signing |
| `kalshi/client.py` | REST client: markets, order book, candlesticks, Create Order V2, balance, positions |
| `markets.py` | Market, price grid, and order book parsing |
| `pricing.py` | Settlement-average distribution, tick history, volatility estimator |
| `strategy.py` | Fair value, ladder walk, Kelly sizing, risk-capped size search |
| `risk.py` | Gates and worst-case-loss room |
| `execution.py` | Paper fills against a freshly fetched book; live IOC orders (`bid` buys YES, `ask` buys NO) |
| `engine.py` | Market discovery and rollover, basis calibration, decision loop, settlement |
| `backtest.py` | Historical replay with calibration and a volatility sweep |
| `cli.py` | `markets`, `paper`, `live`, `backtest`, `report` |

## Getting started

```bash
cd kalshi-crypto-bot
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest -q                      # 55 tests

# Live markets with the model's fair value (no account needed)
.venv/bin/python -m kalshi_bot markets --assets BTC,ETH,SOL,XRP,DOGE

# Replay the last 3 days and re-score the model at several vol multipliers
.venv/bin/python -m kalshi_bot backtest --assets BTC,ETH,SOL --days 3 --vol-sweep 0.8,0.9,1.0 --csv trades.csv

# Paper trade against live order books (Ctrl-C to stop), then summarize
.venv/bin/python -m kalshi_bot paper --assets BTC,ETH,SOL
.venv/bin/python -m kalshi_bot report
```

Tune parameters by copying `config.example.toml` to `config.toml` and passing
`-c config.toml`.

### Live trading

1. Create an API key on [demo.kalshi.co](https://demo.kalshi.co) (Account &
   security → API Keys) and save the private key file.
2. `cp .env.example .env`, fill it in, then `set -a; source .env; set +a`.
3. Run on demo first: `KALSHI_ENV=demo .venv/bin/python -m kalshi_bot live --confirm-live`.
   Check in the Kalshi UI that fills, prices, and the NO-side average price
   match the ledger (`report --mode live`).
4. Production: set `KALSHI_ENV=prod`, start with a small `bankroll` and risk
   limits, and run under a process supervisor (`tmux`, `systemd`).

With credentials, `price_source = "auto"` switches to the CF Benchmarks feed.

## Backtest results

RESULTS_PLACEHOLDER

## Limitations and next steps

* **The edge is not proven.** The model is roughly as accurate as the market
  and wins by a small margin only when blended with it. Most of the realistic
  edge is latency: reacting to index moves before market makers re-quote. A
  1-minute backtest cannot measure that, so paper and demo results matter more.
* **Maker quoting.** Makers pay no fees on these series. Resting post-only
  quotes around fair value would remove the 1–2¢ taker hurdle, but needs order
  management (cancel/replace, inventory skew) and the authenticated order book
  WebSocket.
* **Fat tails.** A Student-t or empirical return distribution could replace
  the `vol_multiplier` shortcut.
* **Event risk.** Macro releases (CPI, FOMC) move crypto in jumps; a calendar
  filter would sit out those windows.
* **Reconciliation.** Live mode warns about existing positions it did not open,
  and halts a market after an ambiguous order. A full reconcile against
  `/portfolio/fills` would make restarts seamless.
