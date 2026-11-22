import math
import random

import pytest

from kalshi_bot.pricing import (
    PriceHistory,
    VolEstimator,
    prob_yes,
    settlement_distribution,
    var_per_s_from_closes,
)


def simulate_settlement(tau: int, spot: float, sigma_p: float, partial_sum: float, partial_n: int, rng: random.Random) -> float:
    """Average of the last 60 one-second ticks, given `partial_n` ticks already observed."""
    window = 60
    x = spot
    ticks = []
    for second in range(1, tau + 1):
        x += sigma_p * rng.gauss(0, 1)
        if second > tau - window:
            ticks.append(x)
    if tau > window:
        return sum(ticks) / len(ticks)
    return (partial_sum + sum(ticks)) / (partial_n + len(ticks))


@pytest.mark.parametrize(
    "tau,partial_n",
    [(240, 0), (60, 0), (25, 35)],
)
def test_settlement_distribution_matches_monte_carlo(tau, partial_n):
    rng = random.Random(7)
    spot, sigma_s = 100.0, 0.0004
    partial_sum = 99.9 * partial_n
    dist = settlement_distribution(tau, spot, sigma_s, partial_sum, partial_n)
    samples = [simulate_settlement(tau, spot, sigma_s * spot, partial_sum, partial_n, rng) for _ in range(6000)]
    mean = sum(samples) / len(samples)
    sd = math.sqrt(sum((s - mean) ** 2 for s in samples) / (len(samples) - 1))
    assert mean == pytest.approx(dist.mean, abs=3 * dist.sd / math.sqrt(len(samples)) + 1e-9)
    assert sd == pytest.approx(dist.sd, rel=0.04)


def test_averaging_window_reduces_variance_versus_spot():
    sigma, spot = 0.0005, 100.0
    dist = settlement_distribution(300, spot, sigma)
    point_sd = sigma * spot * math.sqrt(300)
    expected_sd = sigma * spot * math.sqrt(240 + 61 * 121 / 360)
    assert dist.sd == pytest.approx(expected_sd)
    assert dist.sd < point_sd


def test_prob_yes_basic_properties():
    assert prob_yes(100, 600, 100, 0.0004) == pytest.approx(0.5)
    assert prob_yes(100, 600, 100.5, 0.0004) > 0.5 > prob_yes(100, 600, 99.5, 0.0004)
    # Less time left means a given lead is worth more.
    assert prob_yes(100, 60, 100.2, 0.0004) > prob_yes(100, 600, 100.2, 0.0004)
    # Ties resolve YES ("at least").
    assert prob_yes(100, 0, 100, 0.0004) == 1.0
    assert prob_yes(100, 0, 99.99, 0.0004) == 0.0


def test_prob_yes_after_close_uses_observed_average():
    assert prob_yes(100, 0, 50, 0.0004, partial_sum=60 * 100.01, partial_n=60) == 1.0
    assert prob_yes(100, 0, 150, 0.0004, partial_sum=60 * 99.99, partial_n=60) == 0.0


def test_in_window_partial_average_dominates_late():
    # 55 ticks averaging 101 with 5s left: even a spot below the strike cannot drag it under 100.
    p = prob_yes(100, 5, 99.5, 0.0004, partial_sum=55 * 101.0, partial_n=55)
    assert p > 0.99


def test_price_history_window_is_start_exclusive_end_inclusive():
    h = PriceHistory()
    for t in range(0, 11):
        h.add(float(t), 100.0 + t)
    assert h.window(5, 10) == (sum(100.0 + t for t in range(6, 11)), 5)
    assert h.window_avg(20, 30) is None
    assert h.latest() == (10.0, 110.0)
    assert not h.add(9.0, 1.0)  # out of order
    assert not h.add(11.0, -1.0)  # invalid price
    assert h.price_at(4.5) == 104.0
    assert h.covers(0.0) and not h.covers(-1.0)


def test_price_history_prunes_old_ticks():
    h = PriceHistory(max_age_s=10)
    for t in range(0, 30):
        h.add(float(t), 1.0)
    assert len(h) == 11


def test_vol_estimator_recovers_true_variance():
    rng = random.Random(3)
    sigma = 0.0003
    est = VolEstimator(halflife_s=20000, sample_s=5)
    price, t = 100.0, 0.0
    for _ in range(40000):
        t += 1
        price *= math.exp(sigma * rng.gauss(0, 1))
        est.update(t, price)
    assert est.sigma() == pytest.approx(sigma, rel=0.08)
    assert est.samples > 7000


def test_vol_estimator_warmup_is_an_average_and_seed_carries_weight():
    est = VolEstimator(halflife_s=1e9, sample_s=5)
    assert est.sigma() is None
    est.update(0, 100.0)
    est.update(5, 100.0 * math.exp(0.01))
    est.update(10, 100.0)
    assert est.var_per_s == pytest.approx(0.01**2 / 5)
    assert est.samples == 2
    est.update(12, 200.0)  # inside sample_s: ignored
    assert est.samples == 2

    seeded = VolEstimator(halflife_s=1800, sample_s=5)
    seeded.seed(1e-8, samples=120, span_s=7200)
    seeded.update(0, 100.0)
    seeded.update(5, 100.0 * math.exp(0.01))  # one huge return
    assert seeded.var_per_s < 1e-6  # a single outlier cannot swamp two hours of history


def test_var_from_closes():
    closes = [100 * math.exp(0.001 * (i % 2)) for i in range(20)]
    var = var_per_s_from_closes(closes, 60)
    assert var == pytest.approx(0.001**2 / 60, rel=1e-6)
    assert var_per_s_from_closes([1, 2], 60) is None
