from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import os, logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Eventia AI Forecasting Service")

DATA_PATH = os.path.join(os.path.dirname(__file__), "training_data.csv")
FEATURES = ["venue_capacity", "tickets_sold", "days_until_event", "artist_popularity", "fill_rate"]


def _build_training_data() -> pd.DataFrame:
    """
    Generate synthetic but domain-realistic historical event data for training.
    Features drive labels via a deterministic sell_score so the model learns
    meaningful relationships rather than random noise.
    """
    np.random.seed(42)
    rows = []

    # (venue_capacity, fill_rate_range, days_range, popularity_range, n_samples)
    segments = [
        (500,   (0.82, 0.99), (0,  14), (68, 98), 20),   # small venue, near sell-out
        (1000,  (0.75, 0.95), (3,  20), (60, 90), 20),   # mid venue, high demand
        (5000,  (0.70, 0.92), (5,  28), (55, 85), 20),   # large, popular headliner
        (10000, (0.65, 0.88), (7,  35), (50, 80), 15),   # arena, strong demand
        (2000,  (0.40, 0.72), (15, 50), (38, 68), 20),   # mid venue, moderate demand
        (8000,  (0.30, 0.65), (25, 65), (30, 60), 15),   # large, average demand
        (1500,  (0.15, 0.45), (30, 85), (18, 52), 20),   # slow mover
        (20000, (0.08, 0.38), (40, 90), (12, 48), 15),   # massive venue, struggling
        (3000,  (0.50, 0.80), (10, 40), (48, 78), 15),   # borderline cases
    ]

    for cap, fr_range, day_range, pop_range, n in segments:
        for _ in range(n):
            fill   = round(np.random.uniform(*fr_range), 4)
            days   = int(np.random.randint(day_range[0], day_range[1] + 1))
            pop    = int(np.random.randint(pop_range[0], pop_range[1] + 1))
            sold   = int(fill * cap)

            # sell_score in [0, 1] — drives both labels
            urgency         = max(0.0, (30 - days) / 30)   # high when days < 30
            sell_score      = fill * 0.50 + (pop / 100) * 0.30 + urgency * 0.20
            sold_out        = 1 if sell_score >= 0.62 else 0

            if sold_out:
                dtso = max(1, int(days * (1 - fill) * 0.85))
            else:
                dtso = min(150, int(days + (1 - fill) * 55 + 8))

            rows.append({
                "venue_capacity":   cap,
                "tickets_sold":     sold,
                "days_until_event": days,
                "artist_popularity": pop,
                "fill_rate":        fill,
                "sold_out":         sold_out,
                "days_to_sell_out": dtso,
            })

    return pd.DataFrame(rows)


# ── Load / generate training data ─────────────────────────────────────────
if os.path.exists(DATA_PATH):
    logger.info("Loading training data from %s", DATA_PATH)
    df = pd.read_csv(DATA_PATH)
else:
    logger.info("No CSV found — generating synthetic training data...")
    df = _build_training_data()
    df.to_csv(DATA_PATH, index=False)
    logger.info("Saved %d training samples to %s", len(df), DATA_PATH)

X       = df[FEATURES]
y_class = df["sold_out"]
y_reg   = df["days_to_sell_out"]

# Confidence model: predicts probability of selling out
confidence_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", GradientBoostingClassifier(
        n_estimators=200, max_depth=3, learning_rate=0.08, random_state=42
    )),
])
confidence_pipeline.fit(X, y_class)

# Sell-out speed model: predicts days until the event sells out
sellout_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("reg", GradientBoostingRegressor(
        n_estimators=200, max_depth=3, learning_rate=0.08, random_state=42
    )),
])
sellout_pipeline.fit(X, y_reg)

logger.info("Models trained on %d samples — ready to serve.", len(df))


# ── Request schema ─────────────────────────────────────────────────────────
class EventData(BaseModel):
    event_id:          str
    venue_capacity:    int
    tickets_sold:      int = 0
    days_until_event:  int = 30
    artist_popularity: int = 50


# ── Endpoints ──────────────────────────────────────────────────────────────
@app.post("/predict")
def predict_demand(data: EventData):
    fill_rate = data.tickets_sold / max(data.venue_capacity, 1)

    features = pd.DataFrame([{
        "venue_capacity":    data.venue_capacity,
        "tickets_sold":      data.tickets_sold,
        "days_until_event":  data.days_until_event,
        "artist_popularity": data.artist_popularity,
        "fill_rate":         fill_rate,
    }])

    confidence_score  = round(float(confidence_pipeline.predict_proba(features)[0][1]), 4)
    predicted_days    = max(1, int(round(float(sellout_pipeline.predict(features)[0]))))

    return {
        "confidence_score":            confidence_score,
        "predicted_days_to_sell_out":  predicted_days,
        "fill_rate":                   round(fill_rate, 4),
        "model_version":               "v2.0-sklearn-gbm",
    }


@app.get("/health")
def health():
    return {
        "status":           "ok",
        "model":            "GradientBoosting v2.0",
        "training_samples": len(df),
    }
