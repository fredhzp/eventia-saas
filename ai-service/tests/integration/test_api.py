"""
BLACK-BOX integration tests — AI Service HTTP endpoints.
Uses FastAPI's TestClient (no live server needed).
Technique: equivalence partitioning (valid class, invalid class, high-confidence partition).
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "event_id":          "test-event-001",
    "venue_capacity":    5000,
    "tickets_sold":      3500,
    "days_until_event":  10,
    "artist_popularity": 85,
}


# ── BB-23 ─────────────────────────────────────────────────────────────────────

def test_BB23_predict_valid_payload_returns_200_with_all_fields():
    """Valid input returns 200 and all four expected response fields."""
    res = client.post("/predict", json=VALID_PAYLOAD)

    assert res.status_code == 200
    body = res.json()
    assert "confidence_score"           in body
    assert "predicted_days_to_sell_out" in body
    assert "fill_rate"                  in body
    assert "model_version"              in body


# ── BB-24 ─────────────────────────────────────────────────────────────────────

def test_BB24_predict_missing_required_field_returns_422():
    """Missing required field (event_id) must be rejected with 422 Unprocessable Entity."""
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "event_id"}
    res = client.post("/predict", json=payload)

    assert res.status_code == 422


# ── BB-25 ─────────────────────────────────────────────────────────────────────

def test_BB25_high_popularity_near_sellout_yields_high_confidence():
    """
    Equivalence partition: event with high fill_rate (0.90) + high artist popularity (95)
    + very few days remaining should produce confidence_score > 0.5.
    """
    payload = {
        "event_id":          "high-demand-event",
        "venue_capacity":    1000,
        "tickets_sold":      900,   # 90% full
        "days_until_event":  3,
        "artist_popularity": 95,
    }
    res = client.post("/predict", json=payload)

    assert res.status_code == 200
    assert res.json()["confidence_score"] > 0.5, (
        "Expected confidence > 0.5 for a near-sold-out, high-popularity event"
    )


# ── BB-26 ─────────────────────────────────────────────────────────────────────

def test_BB26_health_endpoint_returns_ok():
    """GET /health must always return 200 with status 'ok'."""
    res = client.get("/health")

    assert res.status_code == 200
    assert res.json()["status"] == "ok"
