/**
 * Stock Service
 * Priority: Backend API → Yahoo Finance (free, worldwide) → Mock data
 *
 * Symbol resolution:
 *  - Known DAX symbols (e.g. SAP) → tries SAP.DE first, falls back to SAP
 *  - Full Yahoo symbols (e.g. AAPL, MSFT, APC.DE) → used as-is
 */
import { api } from './api.js'
import { MOCK_STOCKS, getStockBySymbol } from '../utils/mockData.js'

const YAHOO_CHART  = 'https://query1.finance.yahoo.com/v8/finance/chart'
const YAHOO_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search'

const DAX_SYMBOLS = new Set(MOCK_STOCKS.map(s => s.symbol))

// Returns the Yahoo Finance symbol string(s) to try for a given app symbol
function yahooSymbols(symbol) {
  // Already looks like a full Yahoo symbol (contains dot or is ISIN-like)
  if (symbol.includes('.')) return [symbol]
  // Known DAX stock → prefer XETRA (.DE), fallback to bare symbol
  if (DAX_SYMBOLS.has(symbol.toUpperCase())) return [`${symbol}.DE`, symbol]
  // Unknown → try bare first (covers AAPL, MSFT, etc.), then .DE
  return [symbol, `${symbol}.DE`]
}

// ── Yahoo Finance quote ────────────────────────────────────────────────────

async function yahooQuote(symbol) {
  for (const ySymbol of yahooSymbols(symbol)) {
    try {
      const res = await fetch(
        `${YAHOO_CHART}/${ySymbol}?interval=1d&range=1d`,
        { signal: AbortSignal.timeout(6000) }
      )
      if (!res.ok) continue
      const json = await res.json()
      const meta = json?.chart?.result?.[0]?.meta
      if (!meta?.regularMarketPrice) continue

      const price     = parseFloat(meta.regularMarketPrice.toFixed(2))
      const prevClose = parseFloat((meta.chartPreviousClose ?? meta.previousClose ?? price).toFixed(2))
      const change    = parseFloat((price - prevClose).toFixed(2))
      const changePct = parseFloat(((change / prevClose) * 100).toFixed(2))
      const currency  = meta.currency || 'USD'

      return {
        symbol,
        yahooSymbol: ySymbol,
        price,
        change,
        changePct,
        currency,
        high:      parseFloat((meta.regularMarketDayHigh ?? price).toFixed(2)),
        low:       parseFloat((meta.regularMarketDayLow  ?? price).toFixed(2)),
        open:      parseFloat((meta.regularMarketOpen    ?? price).toFixed(2)),
        prevClose,
        exchange:  meta.exchangeName || '',
        name:      meta.longName || meta.shortName || symbol,
      }
    } catch {
      continue
    }
  }
  return null
}

async function yahooHistory(symbol, range) {
  const rangeMap    = { '1W': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y' }
  const intervalMap = { '1W': '1h',  '1M': '1d',  '3M': '1d',  '6M': '1d',  '1Y': '1d' }
  const yahooRange    = rangeMap[range]    || '3mo'
  const yahooInterval = intervalMap[range] || '1d'

  for (const ySymbol of yahooSymbols(symbol)) {
    try {
      const res = await fetch(
        `${YAHOO_CHART}/${ySymbol}?interval=${yahooInterval}&range=${yahooRange}`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) continue
      const json       = await res.json()
      const result     = json?.chart?.result?.[0]
      const timestamps = result?.timestamp
      const quotes     = result?.indicators?.quote?.[0]
      if (!timestamps?.length || !quotes) continue

      const candles = timestamps.map((ts, i) => ({
        date:   new Date(ts * 1000).toISOString().split('T')[0],
        open:   parseFloat((quotes.open[i]  ?? 0).toFixed(2)),
        high:   parseFloat((quotes.high[i]  ?? 0).toFixed(2)),
        low:    parseFloat((quotes.low[i]   ?? 0).toFixed(2)),
        close:  parseFloat((quotes.close[i] ?? 0).toFixed(2)),
        volume: quotes.volume[i] ?? 0,
      })).filter(d => d.close > 0)

      if (candles.length) return candles
    } catch {
      continue
    }
  }
  return null
}

// ── Yahoo Finance search (worldwide) ──────────────────────────────────────

async function yahooSearch(query) {
  try {
    const res = await fetch(
      `${YAHOO_SEARCH}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const json    = await res.json()
    const results = json?.quotes || []
    return results
      .filter(r => r.quoteType === 'EQUITY' || r.quoteType === 'ETF')
      .slice(0, 10)
      .map(r => ({
        symbol:   r.symbol.replace(/\.DE$/, '') || r.symbol,
        yahooSymbol: r.symbol,
        name:     r.longname || r.shortname || r.symbol,
        exchange: r.exchDisp || r.exchange || '',
        type:     r.quoteType || 'EQUITY',
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
    currency: 'EUR',
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

    // 2. Yahoo Finance (worldwide, free)
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

    // 2. Yahoo Finance search (worldwide)
    const yahooResults = await yahooSearch(query)
    if (yahooResults?.length) return yahooResults

    // 3. Mock search (DAX only fallback)
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

    // Yahoo Finance: fetch all DAX quotes in parallel
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
