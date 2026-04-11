const axios = require('axios');
const IForecastStrategy = require('./IForecastStrategy');

class TimeSeriesAI extends IForecastStrategy {
  async predictDemand(historyData) {
    const normalized = this.normalizeData(historyData);

    const response = await axios.post('http://127.0.0.1:8000/predict', {
      event_id: normalized.eventId,
      venue_capacity: normalized.venueCapacity
    });

    return response.data;
  }

  normalizeData(data) {
    return {
      eventId: data.eventId,
      venueCapacity: data.venueCapacity || 10000
    };
  }
}

module.exports = TimeSeriesAI;
