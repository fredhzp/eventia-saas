class IForecastStrategy {
  async predictDemand(historyData) {
    throw new Error('predictDemand() must be implemented by a subclass');
  }
}

module.exports = IForecastStrategy;
