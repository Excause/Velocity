import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Search, Star, StarOff, Bell, TrendingUp, TrendingDown, Volume2, BarChart2 } from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from 'recharts'
import { useAppStore } from '../store/appStore.js'
import { stockService } from '../services/stockService.js'
import { MOCK_STOCKS, getStockBySymbol } from '../utils/mockData.js'
import {
  formatPriceCompact, formatChangePct, formatChange, formatMarketCap,
  formatVolume, colorForChange,
} from '../utils/formatters.js'
import { clsx } from 'clsx'

const RANGES = ['1W', '1M', '3M', '6M', '1Y']

export default function Stocks() {
  const { symbol: paramSymbol } = useParams()
  const [searchParams] = useSearchParams()
  const { watchlist, addToWatchlist, removeFromWatchlist, addAlert } = useAppStore()

  const [allStocks, setAllStocks] = useState(MOCK_STOCKS)
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [range, setRange] = useState('3M')
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertPrice, setAlertPrice] = useState('')
  const [alertDir, setAlertDir] = useState('above')
  const [livePrice, setLivePrice] = useState(null)
  const liveRef = useRef(null)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearch(q)

    // Default: select first or AAPL
    const sym = paramSymbol || 'AAPL'
    loadStock(sym)
  }, [paramSymbol])

  useEffect(() => {
    if (!selected) return
    loadHistory(selected.symbol, range)
  }, [range, selected?.symbol])

  // Simulate live price updates
  useEffect(() => {
    if (!selected) return
    const interval = setInterval(() => {
      setLivePrice(prev => {
        const base = prev || selected.price
        const variation = (Math.random() - 0.5) * 0.002
        const newPrice = parseFloat((base * (1 + variation)).toFixed(2))
        return newPrice
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [selected?.symbol])

  async function loadStock(symbol) {
    setLoading(true)
    const stock = getStockBySymbol(symbol) || MOCK_STOCKS[0]
    setSelected(stock)
    setLivePrice(stock.price)
    await loadHistory(symbol, range)
    setLoading(false)
  }

  async function loadHistory(symbol, r) {
    const data = await stockService.getHistory(symbol, r)
    setHistory(data)
  }

  const filtered = allStocks.filter(s =>
    !search ||
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const isWatchlisted = selected && watchlist.includes(selected.symbol)

  const historyReturn = history.length > 1
    ? ((history[history.length - 1].close - history[0].close) / history[0].close) * 100
    : 0

  const currentPrice = livePrice || selected?.price || 0
  const priceChange = selected ? currentPrice - (selected.price - selected.change) : 0
  const pricePct = selected ? (priceChange / (selected.price - selected.change)) * 100 : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Aktienkurse</h1>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Stock list */}
        <div className="xl:col-span-1 card p-0 overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Aktie suchen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-dark w-full pl-8 py-1.5 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(stock => (
              <StockListItem
                key={stock.symbol}
                stock={stock}
                isSelected={selected?.symbol === stock.symbol}
                isWatchlisted={watchlist.includes(stock.symbol)}
                onClick={() => loadStock(stock.symbol)}
              />
            ))}
          </div>
        </div>

        {/* Main chart area */}
        <div className="xl:col-span-3 space-y-4">
          {selected && (
            <>
              {/* Stock header */}
              <div className="card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-bg-elevated rounded-xl flex items-center justify-center text-xl font-bold text-gray-300">
                        {selected.symbol.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                        <p className="text-sm text-gray-500">{selected.symbol} · {selected.sector}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold font-mono text-white">
                      {formatPriceCompact(currentPrice)}
                    </p>
                    <p className={`text-sm font-mono font-semibold mt-0.5 ${pricePct >= 0 ? 'text-bull' : 'text-bear'}`}>
                      {pricePct >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({formatChangePct(pricePct, true)})
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Live · Aktualisiert soeben</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  <button
                    onClick={() => isWatchlisted ? removeFromWatchlist(selected.symbol) : addToWatchlist(selected.symbol)}
                    className={clsx('flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-all',
                      isWatchlisted
                        ? 'border-watch text-watch bg-watch-dim hover:bg-watch-dim/80'
                        : 'border-border text-gray-400 hover:border-gray-600 hover:text-gray-200'
                    )}
                  >
                    {isWatchlisted ? <Star size={14} className="fill-current" /> : <StarOff size={14} />}
                    {isWatchlisted ? 'Auf Watchlist' : 'Watchlist'}
                  </button>
                  <button
                    onClick={() => setShowAlertModal(true)}
                    className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-border text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-all"
                  >
                    <Bell size={14} /> Kursalarm
                  </button>
                  <Link
                    to="/simulator"
                    className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-white transition-all"
                  >
                    <TrendingUp size={14} /> Im Simulator handeln
                  </Link>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Marktkapitalisierung" value={formatMarketCap(selected.marketCap)} />
                <StatCard label="KGV" value={selected.pe?.toFixed(1) || '—'} />
                <StatCard label="Performance (Zeitraum)" value={formatChangePct(historyReturn, true)} positive={historyReturn >= 0} />
                <StatCard label="Volumen (letzte)" value={formatVolume(history[history.length - 1]?.volume)} />
              </div>

              {/* Chart */}
              <div className="card">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="font-semibold text-white">Kursverlauf</h3>
                  <div className="flex gap-1">
                    {RANGES.map(r => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={clsx(
                          'text-xs px-2.5 py-1 rounded font-medium transition-all',
                          range === r ? 'bg-accent-blue text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-bg-elevated'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={historyReturn >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={historyReturn >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6B7280', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval={Math.floor(history.length / 6)}
                      />
                      <YAxis
                        tick={{ fill: '#6B7280', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `$${v.toFixed(0)}`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="bg-bg-elevated border border-border rounded-lg p-3 text-xs shadow-xl">
                              <p className="text-gray-400 mb-1">{label}</p>
                              <p className="font-mono font-bold text-white">${payload[0]?.value?.toFixed(2)}</p>
                              <p className="text-gray-500">Vol: {formatVolume(payload[0]?.payload?.volume)}</p>
                            </div>
                          )
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke={historyReturn >= 0 ? '#10B981' : '#EF4444'}
                        strokeWidth={2}
                        fill="url(#priceGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Volume chart */}
              <div className="card">
                <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                  <Volume2 size={14} /> Handelsvolumen
                </h3>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={history.slice(-30)} margin={{ top: 0, right: 5, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" tick={false} axisLine={false} />
                    <YAxis tick={false} axisLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="bg-bg-elevated border border-border rounded p-2 text-xs">
                            <p className="text-gray-400">{label}</p>
                            <p className="font-mono text-white">{formatVolume(payload[0]?.value)}</p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="volume" fill="#3B82F6" opacity={0.6} radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Alert Modal */}
      {showAlertModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAlertModal(false)} />
          <div className="relative bg-bg-card border border-border rounded-xl p-6 w-80 shadow-2xl animate-fade-in">
            <h3 className="font-semibold text-white mb-4">Kursalarm für {selected.symbol}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Richtung</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAlertDir('above')}
                    className={`py-2 rounded-lg text-sm ${alertDir === 'above' ? 'bg-bull-dim text-bull' : 'bg-bg-elevated text-gray-400'}`}
                  >
                    ▲ Über
                  </button>
                  <button
                    onClick={() => setAlertDir('below')}
                    className={`py-2 rounded-lg text-sm ${alertDir === 'below' ? 'bg-bear-dim text-bear' : 'bg-bg-elevated text-gray-400'}`}
                  >
                    ▼ Unter
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Zielkurs (USD)</label>
                <input
                  type="number"
                  value={alertPrice}
                  onChange={e => setAlertPrice(e.target.value)}
                  placeholder={currentPrice.toFixed(2)}
                  className="input-dark w-full"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAlertModal(false)} className="btn-ghost flex-1">Abbrechen</button>
                <button
                  onClick={() => {
                    if (alertPrice) {
                      addAlert(selected.symbol, parseFloat(alertPrice), alertDir)
                      setShowAlertModal(false)
                      setAlertPrice('')
                    }
                  }}
                  className="btn-primary flex-1"
                >
                  Alarm setzen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StockListItem({ stock, isSelected, isWatchlisted, onClick }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-bg-elevated border-b border-border/50 transition-colors',
        isSelected ? 'bg-bg-elevated border-l-2 border-l-accent-blue' : ''
      )}
    >
      <div className="w-7 h-7 bg-bg-elevated rounded flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-gray-400">{stock.symbol.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs font-bold text-white">{stock.symbol}</p>
          {isWatchlisted && <Star size={9} className="text-watch fill-current" />}
        </div>
        <p className="text-xs text-gray-600 truncate">{stock.name}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-mono font-semibold text-white">{formatPriceCompact(stock.price)}</p>
        <p className={`text-xs font-mono ${stock.changePct >= 0 ? 'text-bull' : 'text-bear'}`}>
          {formatChangePct(stock.changePct, true)}
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, positive }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-mono font-bold ${positive === true ? 'text-bull' : positive === false ? 'text-bear' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
