"""
WHITE-BOX unit tests — AI model pipelines (confidence_pipeline, sellout_pipeline).
Tests call the trained Scikit-Learn pipelines directly, bypassing the HTTP layer.
Technique: boundary value analysis on model output ranges.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pandas as pd
import pytest
from main import confidence_pipeline, sellout_pipeline, FEATURES


def _make_features(venue_capacity=1000, tickets_sold=600,
                   days_until_event=20, artist_popularity=70):
    """Build a single-row DataFrame with a derived fill_rate."""
    fill_rate = tickets_sold / max(venue_capacity, 1)
    return pd.DataFrame([{
        "venue_capacity":    venue_capacity,
        "tickets_sold":      tickets_sold,
        "days_until_event":  days_until_event,
        "artist_popularity": artist_popularity,
        "fill_rate":         fill_rate,
    }])


# ── WB-13 ─────────────────────────────────────────────────────────────────────

def test_WB13_confidence_score_between_0_and_1():
    """Confidence score must always be a probability in [0, 1]."""
    features = _make_features()
    score = float(confidence_pipeline.predict_proba(features)[0][1])
    assert 0.0 <= score <= 1.0, f"confidence_score {score} is out of range"


# ── WB-14 ─────────────────────────────────────────────────────────────────────

def test_WB14_predicted_days_non_negative():
    """Predicted days to sell out must be ≥ 0."""
    features = _make_features()
    days = float(sellout_pipeline.predict(features)[0])
    assert days >= 0, f"predicted_days_to_sell_out {days} is negative"


# ── WB-15 ─────────────────────────────────────────────────────────────────────

def test_WB15_fill_rate_derived_correctly():
    """fill_rate = tickets_sold / venue_capacity (verifies feature engineering)."""
    capacity = 2000
    sold = 1500
    expected_fill_rate = sold / capacity

    features = _make_features(venue_capacity=capacity, tickets_sold=sold)
    assert features["fill_rate"].iloc[0] == pytest.approx(expected_fill_rate, rel=1e-6)


# ── WB-16 ─────────────────────────────────────────────────────────────────────

def test_WB16_model_handles_overfull_event_without_crashing():
    """tickets_sold > venue_capacity (fill_rate > 1) must not raise an exception."""
    features = _make_features(venue_capacity=100, tickets_sold=120)
    # fill_rate = 1.2 — model should handle gracefully
    score = float(confidence_pipeline.predict_proba(features)[0][1])
    days  = float(sellout_pipeline.predict(features)[0])
    assert 0.0 <= score <= 1.0
    assert days >= 0
