/**
 * Stock Service
 * Priority: Backend API → Yahoo Finance (XETRA, free) → Mock data
 */
import { api } from './api.js'
import { MOCK_STOCKS, getStockBySymbol } from '../utils/mockData.js'

const YAHOO_PROXY = 'https://query1.finance.yahoo.com/v8/finance/chart'

// ── Yahoo Finance direct call ──────────────────────────────────────────────

async function yahooQuote(symbol) {
  try {
    const res = await fetch(
      `${YAHOO_PROXY}/${symbol}.DE?interval=1d&range=1d`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null

    const price     = parseFloat(meta.regularMarketPrice.toFixed(2))
    const prevClose = parseFloat((meta.chartPreviousClose ?? meta.previousClose ?? price).toFixed(2))
    const change    = parseFloat((price - prevClose).toFixed(2))
    const changePct = parseFloat(((change / prevClose) * 100).toFixed(2))

    return {
      symbol,
      price,
      change,
      changePct,
      high:      parseFloat((meta.regularMarketDayHigh  ?? price).toFixed(2)),
      low:       parseFloat((meta.regularMarketDayLow   ?? price).toFixed(2)),
      open:      parseFloat((meta.regularMarketOpen     ?? price).toFixed(2)),
      prevClose,
    }
  } catch {
    return null
  }
}

async function yahooHistory(symbol, range) {
  const rangeMap       = { '1W': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y' }
  const intervalMap    = { '1W': '1h',  '1M': '1d',  '3M': '1d',  '6M': '1d',  '1Y': '1d' }
  const yahooRange     = rangeMap[range]     || '3mo'
  const yahooInterval  = intervalMap[range]  || '1d'

  try {
    const res = await fetch(
      `${YAHOO_PROXY}/${symbol}.DE?interval=${yahooInterval}&range=${yahooRange}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const json      = await res.json()
    const result    = json?.chart?.result?.[0]
    const timestamps = result?.timestamp
    const quotes    = result?.indicators?.quote?.[0]
    if (!timestamps?.length || !quotes) return null

    return timestamps.map((ts, i) => ({
      date:   new Date(ts * 1000).toISOString().split('T')[0],
      open:   parseFloat((quotes.open[i]  ?? 0).toFixed(2)),
      high:   parseFloat((quotes.high[i]  ?? 0).toFixed(2)),
      low:    parseFloat((quotes.low[i]   ?? 0).toFixed(2)),
      close:  parseFloat((quotes.close[i] ?? 0).toFixed(2)),
      volume: quotes.volume[i] ?? 0,
    })).filter(d => d.close > 0)
  } catch {
    return null
  }
}

// ── Mock fallback ──────────────────────────────────────────────────────────

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

// ── Public API ─────────────────────────────────────────────────────────────

export const stockService = {
  async getQuote(symbol) {
    // 1. Backend
    try {
      const data = await api.get(`/stocks/quote/${symbol.toUpperCase()}`)
      if (data?.price) return data
    } catch {}

    // 2. Yahoo Finance (XETRA, free)
    const yq = await yahooQuote(symbol)
    if (yq) return yq

    // 3. Mock
    return _mockQuote(symbol)
  },

  async getMultipleQuotes(symbols) {
    const results = await Promise.all(symbols.map(s => this.getQuote(s)))
    return results.filter(Boolean)
  },

  async getHistory(symbol, range = '3M') {
    // 1. Backend
    try {
      const data = await api.get(`/stocks/history/${symbol.toUpperCase()}?range=${range}`)
      if (data?.length) return data
    } catch {}

    // 2. Yahoo Finance candles
    const candles = await yahooHistory(symbol, range)
    if (candles?.length) return candles

    // 3. Mock
    const days  = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range] || 90
    const stock = getStockBySymbol(symbol)
    return stock ? stock.history.slice(-days) : []
  },

  async search(query) {
    if (!query || query.length < 2) return []

    // 1. Backend
    try {
      const data = await api.get(`/stocks/search?q=${encodeURIComponent(query)}`)
      if (data?.length) return data
    } catch {}

    // 2. Mock search
    const q = query.toLowerCase()
    return MOCK_STOCKS.filter(
      s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 10)
  },

  async getAllStocks() {
    const symbols = MOCK_STOCKS.map(s => s.symbol)

    // Backend batch
    try {
      const data = await api.get(`/stocks/batch?symbols=${symbols.join(',')}`)
      if (data?.length) {
        return data.map(q => {
          const mock = getStockBySymbol(q.symbol)
          return { ...mock, ...q }
        })
      }
    } catch {}

    // Yahoo Finance: fetch all quotes in parallel
    const quotes = await Promise.all(symbols.map(s => yahooQuote(s)))
    const valid  = quotes.filter(Boolean)
    if (valid.length >= 5) {
      return valid.map(q => {
        const mock = getStockBySymbol(q.symbol)
        return { ...mock, ...q }
      })
    }

    // Mock fallback
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
    const quote = await this.getQuote(symbol)
    const mock  = getStockBySymbol(symbol)
    return { ...mock, ...quote }
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
