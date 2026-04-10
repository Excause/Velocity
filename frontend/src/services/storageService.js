// Persistent storage service using localStorage

const KEYS = {
  SETTINGS: 'velocity_settings',
  WATCHLIST: 'velocity_watchlist',
  PORTFOLIO: 'velocity_portfolio',
  FEEDBACK: 'velocity_feedback',
  ALERTS: 'velocity_alerts',
}

export const storageService = {
  // Settings (API keys, preferences)
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}')
    } catch { return {} }
  },
  saveSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
  },

  // Watchlist
  getWatchlist() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.WATCHLIST) || '["AAPL","MSFT","NVDA","TSLA"]')
    } catch { return ['AAPL', 'MSFT', 'NVDA', 'TSLA'] }
  },
  saveWatchlist(symbols) {
    localStorage.setItem(KEYS.WATCHLIST, JSON.stringify(symbols))
  },
  addToWatchlist(symbol) {
    const list = this.getWatchlist()
    if (!list.includes(symbol)) {
      list.push(symbol)
      this.saveWatchlist(list)
    }
    return list
  },
  removeFromWatchlist(symbol) {
    const list = this.getWatchlist().filter(s => s !== symbol)
    this.saveWatchlist(list)
    return list
  },

  // Portfolio
  getPortfolio() {
    try {
      const data = localStorage.getItem(KEYS.PORTFOLIO)
      if (!data) return null
      return JSON.parse(data)
    } catch { return null }
  },
  savePortfolio(portfolio) {
    localStorage.setItem(KEYS.PORTFOLIO, JSON.stringify(portfolio))
  },
  resetPortfolio() {
    localStorage.removeItem(KEYS.PORTFOLIO)
  },

  // AI Feedback
  saveFeedback(recommendationId, feedback) {
    const all = this.getFeedback()
    all[recommendationId] = { feedback, timestamp: new Date().toISOString() }
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all))
  },
  getFeedback() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.FEEDBACK) || '{}')
    } catch { return {} }
  },

  // Price Alerts
  getAlerts() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ALERTS) || '[]')
    } catch { return [] }
  },
  saveAlerts(alerts) {
    localStorage.setItem(KEYS.ALERTS, JSON.stringify(alerts))
  },
  addAlert(symbol, targetPrice, direction) {
    const alerts = this.getAlerts()
    alerts.push({ id: Date.now(), symbol, targetPrice, direction, createdAt: new Date().toISOString(), triggered: false })
    this.saveAlerts(alerts)
    return alerts
  },
}
