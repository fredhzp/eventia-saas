from fastapi import FastAPI
from pydantic import BaseModel
import random

app = FastAPI()

# Define the expected incoming data from Node.js
class EventData(BaseModel):
    event_id: str
    venue_capacity: int

@app.post("/predict")
def predict_demand(data: EventData):
    # MOCK LOGIC: We will build the real regression model later.
    # For the milestone, we just return a random high probability.
    probability = round(random.uniform(0.75, 0.98), 2)

    return {
        "confidence_score": probability,
        "predicted_days_to_sell_out": 14,
        "model_version": "v1.0-mvp"
    }