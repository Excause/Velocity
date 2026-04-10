import { MOCK_STOCKS, getStockBySymbol } from '../utils/mockData.js'
import { storageService } from './storageService.js'

// Finnhub: deutsche Aktien mit ":XETRA" Suffix (z.B. "SAP:XETRA")
// Yahoo Finance (yfinance): ".DE" Suffix (z.B. "SAP.DE") – nur im Backend
const BASE_FINNHUB = 'https://finnhub.io/api/v1'

// Finnhub-Symbol für deutsche XETRA-Aktien
function toFinnhubSymbol(symbol) {
  return `${symbol}:XETRA`
}

export const stockService = {
  // Einzelkurs abrufen
  async getQuote(symbol) {
    const settings = storageService.getSettings()
    const apiKey = settings.finnhubKey

    if (apiKey) {
      try {
        const fhSymbol = toFinnhubSymbol(symbol)
        const res = await fetch(
          `${BASE_FINNHUB}/quote?symbol=${fhSymbol}&token=${apiKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (res.ok) {
          const data = await res.json()
          if (data.c && data.c > 0) {
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
        }
      } catch (e) {
        console.warn('Finnhub API nicht verfügbar, Demo-Daten werden verwendet:', e)
      }
    }

    // Demo-Fallback mit leichter Preis-Variation für "Live"-Gefühl
    const stock = getStockBySymbol(symbol)
    if (!stock) return null
    const variation = (Math.random() - 0.5) * 0.002
    const price = parseFloat((stock.price * (1 + variation)).toFixed(2))
    const prevClose = parseFloat((stock.price - stock.change).toFixed(2))
    return {
      symbol,
      price,
      change: parseFloat((price - prevClose).toFixed(2)),
      changePct: parseFloat(((price - prevClose) / prevClose * 100).toFixed(2)),
      high:      parseFloat((price * 1.005).toFixed(2)),
      low:       parseFloat((price * 0.995).toFixed(2)),
      open:      parseFloat((price * 0.998).toFixed(2)),
      prevClose,
    }
  },

  // Mehrere Kurse gleichzeitig
  async getMultipleQuotes(symbols) {
    const results = await Promise.all(symbols.map(s => this.getQuote(s)))
    return results.filter(Boolean)
  },

  // Kurshistorie – Zeiträume: '1W' | '1M' | '3M' | '6M' | '1Y'
  async getHistory(symbol, range = '3M') {
    const days = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range] || 90
    const stock = getStockBySymbol(symbol)
    if (stock) return stock.history.slice(-days)
    return []
  },

  // Aktiensuche (Name oder Symbol)
  async search(query) {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return MOCK_STOCKS.filter(
      s =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.yahooSymbol?.toLowerCase().includes(q)
    ).slice(0, 10)
  },

  // Alle Aktien (für Übersichten)
  async getAllStocks() {
    return MOCK_STOCKS.map(s => ({
      ...s,
      price: parseFloat((s.price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(2)),
    }))
  },

  // Top Gewinner und Verlierer
  async getTopMovers() {
    const all = await this.getAllStocks()
    const sorted = [...all].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    return {
      gainers: sorted.filter(s => s.changePct > 0).slice(0, 5),
      losers:  sorted.filter(s => s.changePct < 0).slice(0, 5),
    }
  },

  // Unternehmensdetails
  async getDetails(symbol) {
    const settings = storageService.getSettings()
    const apiKey = settings.finnhubKey
    const stock = getStockBySymbol(symbol)

    if (apiKey && stock) {
      try {
        const fhSymbol = toFinnhubSymbol(symbol)
        const res = await fetch(
          `${BASE_FINNHUB}/stock/profile2?symbol=${fhSymbol}&token=${apiKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (res.ok) {
          const data = await res.json()
          if (data.name) return { ...stock, ...data }
        }
      } catch {}
    }
    return stock
  },

  // Simuliertes Live-Update eines Kurses
  simulatePriceUpdate(stock) {
    const variation = (Math.random() - 0.5) * 0.003
    const newPrice = parseFloat((stock.price * (1 + variation)).toFixed(2))
    const prevClose = stock.price - stock.change
    const change    = parseFloat((newPrice - prevClose).toFixed(2))
    const changePct = parseFloat(((change / prevClose) * 100).toFixed(2))
    return { ...stock, price: newPrice, change, changePct }
  },
}
