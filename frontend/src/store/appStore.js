import { create } from 'zustand'
import { storageService } from '../services/storageService.js'
import { INITIAL_PORTFOLIO, MOCK_STOCKS } from '../utils/mockData.js'

export const useAppStore = create((set, get) => ({
  // Settings
  settings: storageService.getSettings(),
  updateSettings: (newSettings) => {
    const merged = { ...get().settings, ...newSettings }
    storageService.saveSettings(merged)
    set({ settings: merged })
  },

  // Watchlist
  watchlist: storageService.getWatchlist(),
  addToWatchlist: (symbol) => {
    const updated = storageService.addToWatchlist(symbol)
    set({ watchlist: updated })
  },
  removeFromWatchlist: (symbol) => {
    const updated = storageService.removeFromWatchlist(symbol)
    set({ watchlist: updated })
  },

  // Portfolio (Simulator)
  portfolio: storageService.getPortfolio() || { ...INITIAL_PORTFOLIO },
  buyStock: (symbol, shares, price) => {
    const { portfolio } = get()
    const cost = shares * price
    if (cost > portfolio.cash) return { error: 'Nicht genügend Kapital' }

    const existingPos = portfolio.positions.find(p => p.symbol === symbol)
    const positions = existingPos
      ? portfolio.positions.map(p =>
          p.symbol === symbol
            ? { ...p, shares: p.shares + shares, avgPrice: (p.avgPrice * p.shares + cost) / (p.shares + shares) }
            : p
        )
      : [...portfolio.positions, { symbol, shares, avgPrice: price, openedAt: new Date().toISOString() }]

    const transaction = {
      id: Date.now(),
      type: 'buy',
      symbol,
      shares,
      price,
      total: cost,
      timestamp: new Date().toISOString(),
    }

    const updated = {
      ...portfolio,
      cash: portfolio.cash - cost,
      positions,
      transactions: [transaction, ...portfolio.transactions],
    }
    storageService.savePortfolio(updated)
    set({ portfolio: updated })
    return { success: true }
  },

  sellStock: (symbol, shares, price) => {
    const { portfolio } = get()
    const pos = portfolio.positions.find(p => p.symbol === symbol)
    if (!pos || pos.shares < shares) return { error: 'Nicht genügend Aktien' }

    const proceeds = shares * price
    const positions = pos.shares === shares
      ? portfolio.positions.filter(p => p.symbol !== symbol)
      : portfolio.positions.map(p =>
          p.symbol === symbol ? { ...p, shares: p.shares - shares } : p
        )

    const pnl = (price - pos.avgPrice) * shares
    const transaction = {
      id: Date.now(),
      type: 'sell',
      symbol,
      shares,
      price,
      total: proceeds,
      pnl,
      timestamp: new Date().toISOString(),
    }

    const updated = {
      ...portfolio,
      cash: portfolio.cash + proceeds,
      positions,
      transactions: [transaction, ...portfolio.transactions],
    }
    storageService.savePortfolio(updated)
    set({ portfolio: updated })
    return { success: true, pnl }
  },

  resetPortfolio: () => {
    const fresh = { ...INITIAL_PORTFOLIO, createdAt: new Date().toISOString() }
    storageService.savePortfolio(fresh)
    set({ portfolio: fresh })
  },

  // Compute portfolio value
  getPortfolioValue: () => {
    const { portfolio } = get()
    const posValue = portfolio.positions.reduce((acc, pos) => {
      const stock = MOCK_STOCKS.find(s => s.symbol === pos.symbol)
      return acc + (stock ? stock.price * pos.shares : pos.avgPrice * pos.shares)
    }, 0)
    return portfolio.cash + posValue
  },

  // Alerts
  alerts: storageService.getAlerts(),
  addAlert: (symbol, targetPrice, direction) => {
    const updated = storageService.addAlert(symbol, targetPrice, direction)
    set({ alerts: updated })
  },

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}))
