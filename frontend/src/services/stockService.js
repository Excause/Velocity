/**
 * Stock Service
 * Priority: Backend API → Finnhub (direct, if key set) → Mock data
 *
 * For German XETRA stocks, Finnhub uses the ":XETRA" suffix.
 * A free Finnhub key can be set in Settings.
 */
import { api } from './api.js'
import { storageService } from './storageService.js'
import { MOCK_STOCKS, getStockBySymbol } from '../utils/mockData.js'

const FINNHUB_BASE = 'https://finnhub.io/api/v1'

function toFinnhubSymbol(symbol) {
  return `${symbol}:XETRA`
}

// ── Finnhub direct call ────────────────────────────────────────────────────

async function finnhubQuote(symbol) {
  const { finnhubKey } = storageService.getSettings()
  if (!finnhubKey) return null

  try {
    const fhSym = toFinnhubSymbol(symbol)
    const res   = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${fhSym}&token=${finnhubKey}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const d = await res.json()
    if (!d.c || d.c <= 0) return null
    return {
      symbol,
      price:     d.c,
      change:    d.d,
      changePct: d.dp,
      high:      d.h,
      low:       d.l,
      open:      d.o,
      prevClose: d.pc,
    }
  } catch {
    return null
  }
}

async function finnhubCandles(symbol, range) {
  const { finnhubKey } = storageService.getSettings()
  if (!finnhubKey) return null

  const now        = Math.floor(Date.now() / 1000)
  const secondsMap = { '1W': 7*86400, '1M': 30*86400, '3M': 90*86400, '6M': 180*86400, '1Y': 365*86400 }
  const resolution = range === '1W' ? '60' : 'D'
  const from       = now - (secondsMap[range] || secondsMap['3M'])

  try {
    const fhSym = toFinnhubSymbol(symbol)
    const res   = await fetch(
      `${FINNHUB_BASE}/stock/candle?symbol=${fhSym}&resolution=${resolution}&from=${from}&to=${now}&token=${finnhubKey}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const d = await res.json()
    if (d.s !== 'ok' || !d.c?.length) return null

    return d.t.map((ts, i) => ({
      date:   new Date(ts * 1000).toISOString().split('T')[0],
      open:   parseFloat(d.o[i].toFixed(2)),
      high:   parseFloat(d.h[i].toFixed(2)),
      low:    parseFloat(d.l[i].toFixed(2)),
      close:  parseFloat(d.c[i].toFixed(2)),
      volume: d.v[i],
    }))
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

    // 2. Finnhub direct
    const fh = await finnhubQuote(symbol)
    if (fh) return fh

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

    // 2. Finnhub candles
    const candles = await finnhubCandles(symbol, range)
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

    // 2. Finnhub symbol search
    const { finnhubKey } = storageService.getSettings()
    if (finnhubKey) {
      try {
        const res = await fetch(
          `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${finnhubKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (res.ok) {
          const d = await res.json()
          const results = (d.result || [])
            .filter(r => r.type === 'Common Stock')
            .slice(0, 10)
            .map(r => ({ symbol: r.symbol.replace(':XETRA', ''), name: r.description, exchange: r.primaryExchange }))
          if (results.length) return results
        }
      } catch {}
    }

    // 3. Mock search
    const q = query.toLowerCase()
    return MOCK_STOCKS.filter(
      s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 10)
  },

  async getAllStocks() {
    // Try to get live quotes for all tracked symbols
    const symbols = MOCK_STOCKS.map(s => s.symbol)

    // Backend batch
    try {
      const data = await api.get(`/stocks/batch?symbols=${symbols.join(',')}`)
      if (data?.length) {
        // Merge with mock for missing fields (name, sector, etc.)
        return data.map(q => {
          const mock = getStockBySymbol(q.symbol)
          return { ...mock, ...q }
        })
      }
    } catch {}

    // Finnhub: quote each (rate-limit aware: max 10 parallel)
    const { finnhubKey } = storageService.getSettings()
    if (finnhubKey) {
      const quotes = await Promise.all(symbols.slice(0, 20).map(s => finnhubQuote(s)))
      const valid  = quotes.filter(Boolean)
      if (valid.length >= 5) {
        return valid.map(q => {
          const mock = getStockBySymbol(q.symbol)
          return { ...mock, ...q }
        })
      }
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

    // Finnhub company profile
    const { finnhubKey } = storageService.getSettings()
    if (finnhubKey) {
      try {
        const res = await fetch(
          `${FINNHUB_BASE}/stock/profile2?symbol=${toFinnhubSymbol(symbol)}&token=${finnhubKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (res.ok) {
          const d = await res.json()
          if (d.name) return { ...mock, ...quote, ...d }
        }
      } catch {}
    }
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
