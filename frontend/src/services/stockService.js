/**
 * Stock Service – calls backend /api/stocks
 * Falls back to mock data when the backend is unreachable.
 */
import { api } from './api.js'
import { MOCK_STOCKS, getStockBySymbol } from '../utils/mockData.js'

export const stockService = {
  async getQuote(symbol) {
    try {
      return await api.get(`/stocks/quote/${symbol.toUpperCase()}`)
    } catch {
      return _mockQuote(symbol)
    }
  },

  async getMultipleQuotes(symbols) {
    try {
      const query = symbols.join(',')
      const data  = await api.get(`/stocks/batch?symbols=${query}`)
      if (data && data.length) return data
    } catch {}
    return Promise.all(symbols.map(s => _mockQuote(s))).then(r => r.filter(Boolean))
  },

  async getHistory(symbol, range = '3M') {
    try {
      const data = await api.get(`/stocks/history/${symbol.toUpperCase()}?range=${range}`)
      if (data && data.length) return data
    } catch {}
    // Mock fallback
    const days  = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range] || 90
    const stock = getStockBySymbol(symbol)
    return stock ? stock.history.slice(-days) : []
  },

  async search(query) {
    if (!query || query.length < 2) return []
    try {
      const data = await api.get(`/stocks/search?q=${encodeURIComponent(query)}`)
      if (data && data.length) return data
    } catch {}
    // Mock fallback
    const q = query.toLowerCase()
    return MOCK_STOCKS.filter(
      s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 10)
  },

  async getAllStocks() {
    try {
      const data = await api.get('/stocks/batch')
      if (data && data.length) return data
    } catch {}
    return MOCK_STOCKS.map(s => ({
      ...s,
      price: parseFloat((s.price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(2)),
    }))
  },

  async getTopMovers() {
    const all    = await this.getAllStocks()
    const sorted = [...all].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    return {
      gainers: sorted.filter(s => s.changePct > 0).slice(0, 5),
      losers:  sorted.filter(s => s.changePct < 0).slice(0, 5),
    }
  },

  async getDetails(symbol) {
    try {
      const quote = await api.get(`/stocks/quote/${symbol.toUpperCase()}`)
      if (quote) return { ...getStockBySymbol(symbol), ...quote }
    } catch {}
    return getStockBySymbol(symbol)
  },

  simulatePriceUpdate(stock) {
    const variation = (Math.random() - 0.5) * 0.003
    const newPrice  = parseFloat((stock.price * (1 + variation)).toFixed(2))
    const prevClose = stock.price - stock.change
    const change    = parseFloat((newPrice - prevClose).toFixed(2))
    const changePct = parseFloat(((change / prevClose) * 100).toFixed(2))
    return { ...stock, price: newPrice, change, changePct }
  },
}

function _mockQuote(symbol) {
  const stock = getStockBySymbol(symbol)
  if (!stock) return null
  const variation = (Math.random() - 0.5) * 0.002
  const price     = parseFloat((stock.price * (1 + variation)).toFixed(2))
  const prevClose = parseFloat((stock.price - stock.change).toFixed(2))
  return {
    symbol,
    price,
    change:    parseFloat((price - prevClose).toFixed(2)),
    changePct: parseFloat(((price - prevClose) / prevClose * 100).toFixed(2)),
    high:      parseFloat((price * 1.005).toFixed(2)),
    low:       parseFloat((price * 0.995).toFixed(2)),
    open:      parseFloat((price * 0.998).toFixed(2)),
    prevClose,
  }
}
