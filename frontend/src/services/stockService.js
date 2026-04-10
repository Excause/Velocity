import { MOCK_STOCKS, getStockBySymbol } from '../utils/mockData.js'
import { storageService } from './storageService.js'

const BASE_FINNHUB = 'https://finnhub.io/api/v1'
const BASE_ALPHA = 'https://www.alphavantage.co/query'
const CORS_PROXY = 'https://api.allorigins.win/get?url='

async function fetchWithFallback(url, mockFn) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return mockFn()
  }
}

export const stockService = {
  // Get quote for a single symbol
  async getQuote(symbol) {
    const settings = storageService.getSettings()
    const apiKey = settings.finnhubKey

    if (apiKey) {
      try {
        const res = await fetch(`${BASE_FINNHUB}/quote?symbol=${symbol}&token=${apiKey}`)
        const data = await res.json()
        if (data.c) {
          return {
            symbol,
            price: data.c,
            change: data.d,
            changePct: data.dp,
            high: data.h,
            low: data.l,
            open: data.o,
            prevClose: data.pc,
          }
        }
      } catch (e) {
        console.warn('Finnhub API failed, using mock data', e)
      }
    }

    // Mock fallback with slight random variation
    const stock = getStockBySymbol(symbol)
    if (!stock) return null
    const variation = (Math.random() - 0.5) * 0.002
    const price = stock.price * (1 + variation)
    return {
      symbol,
      price: parseFloat(price.toFixed(2)),
      change: stock.change,
      changePct: stock.changePct,
      high: parseFloat((price * 1.005).toFixed(2)),
      low: parseFloat((price * 0.995).toFixed(2)),
      open: parseFloat((price * 0.998).toFixed(2)),
      prevClose: parseFloat((price - stock.change).toFixed(2)),
    }
  },

  // Get multiple quotes
  async getMultipleQuotes(symbols) {
    const results = await Promise.all(symbols.map(s => this.getQuote(s)))
    return results.filter(Boolean)
  },

  // Get historical price data
  async getHistory(symbol, range = '3M') {
    const settings = storageService.getSettings()
    const days = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range] || 90

    const stock = getStockBySymbol(symbol)
    if (stock) {
      return stock.history.slice(-days)
    }
    return []
  },

  // Search for stocks
  async search(query) {
    const q = query.toLowerCase()
    return MOCK_STOCKS.filter(
      s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 10)
  },

  // Get all stocks (for watchlist, market overview)
  async getAllStocks() {
    return MOCK_STOCKS.map(s => ({
      ...s,
      // Add small random variation to simulate live prices
      price: parseFloat((s.price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(2)),
    }))
  },

  // Get top movers
  async getTopMovers() {
    const all = await this.getAllStocks()
    const sorted = [...all].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    return {
      gainers: sorted.filter(s => s.changePct > 0).slice(0, 5),
      losers: sorted.filter(s => s.changePct < 0).slice(0, 5),
    }
  },

  // Get stock details (company info)
  async getDetails(symbol) {
    const stock = getStockBySymbol(symbol)
    if (!stock) return null

    const settings = storageService.getSettings()
    const apiKey = settings.finnhubKey

    if (apiKey) {
      try {
        const res = await fetch(`${BASE_FINNHUB}/stock/profile2?symbol=${symbol}&token=${apiKey}`)
        const data = await res.json()
        if (data.name) return { ...stock, ...data }
      } catch {}
    }

    return stock
  },

  // Simulate live price updates (for WebSocket simulation)
  simulatePriceUpdate(stock) {
    const variation = (Math.random() - 0.5) * 0.003
    const newPrice = parseFloat((stock.price * (1 + variation)).toFixed(2))
    const change = parseFloat((newPrice - (stock.price - stock.change)).toFixed(2))
    const changePct = parseFloat(((change / (stock.price - stock.change)) * 100).toFixed(2))
    return { ...stock, price: newPrice, change, changePct }
  },
}
