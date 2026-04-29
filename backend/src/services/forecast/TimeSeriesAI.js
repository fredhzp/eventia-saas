const axios = require('axios');
const IForecastStrategy = require('./IForecastStrategy');

class TimeSeriesAI extends IForecastStrategy {
  async predictDemand(historyData) {
    const normalized = this.normalizeData(historyData);

    const aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    const response = await axios.post(`${aiUrl}/predict`, {
      event_id:          normalized.eventId,
      venue_capacity:    normalized.venueCapacity,
      tickets_sold:      normalized.ticketsSold,
      days_until_event:  normalized.daysUntilEvent,
      artist_popularity: normalized.artistPopularity,
    });

    return response.data;
  }

  normalizeData(data) {
    return {
      eventId:          data.eventId,
      venueCapacity:    data.venueCapacity    || 1000,
      ticketsSold:      data.ticketsSold      ?? 0,
      daysUntilEvent:   data.daysUntilEvent   ?? 30,
      artistPopularity: data.artistPopularity ?? 50,
    };
  }
}

module.exports = TimeSeriesAI;
