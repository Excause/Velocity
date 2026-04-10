import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Brain, Newspaper, Activity, ArrowRight, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppStore } from '../store/appStore.js'
import { stockService } from '../services/stockService.js'
import { newsService } from '../services/newsService.js'
import { aiService } from '../services/aiService.js'
import { MOCK_SECTORS, generateBacktestData } from '../utils/mockData.js'
import { formatPriceCompact, formatChangePct, actionLabel } from '../utils/formatters.js'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-mono font-medium">
          {entry.name}: ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { getPortfolioValue, portfolio } = useAppStore()
  const [topMovers, setTopMovers] = useState({ gainers: [], losers: [] })
  const [news, setNews] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [backtestData, setBacktestData] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    loadData()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    setLoading(true)
    const [movers, latestNews, recs] = await Promise.all([
      stockService.getTopMovers(),
      newsService.getNews({ limit: 5 }),
      aiService.getRecommendations('moderate'),
    ])
    setTopMovers(movers)
    setNews(latestNews)
    setRecommendations(recs.slice(0, 4))
    setBacktestData(generateBacktestData(10000, 60))
    setLoading(false)
  }

  async function refresh() {
    const movers = await stockService.getTopMovers()
    setTopMovers(movers)
    setLastUpdate(new Date())
  }

  const portfolioValue = getPortfolioValue()
  const portfolioReturn = ((portfolioValue - portfolio.startingCapital) / portfolio.startingCapital) * 100
  const aiReturn = backtestData.length > 0
    ? ((backtestData[backtestData.length - 1]?.aiPortfolio - 10000) / 10000) * 100
    : 8.4

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Marktübersicht • Aktualisiert {lastUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={refresh} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Aktualisieren
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Mein Portfolio"
          value={`$${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={portfolioReturn}
          subtitle="vs. Startkapital"
          icon={<Activity size={18} />}
        />
        <KpiCard
          title="KI-Performance (60T)"
          value={`+${aiReturn.toFixed(1)}%`}
          change={aiReturn}
          subtitle="Simulierte Empfehlungen"
          icon={<Brain size={18} />}
        />
        <KpiCard
          title="Aktive Empfehlungen"
          value={recommendations.filter(r => r.action === 'buy').length}
          subtitle="Kaufempfehlungen heute"
          icon={<TrendingUp size={18} />}
          noChange
        />
        <KpiCard
          title="Neue Nachrichten"
          value={news.length}
          subtitle="Letzte 24 Stunden"
          icon={<Newspaper size={18} />}
          noChange
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* AI Performance Chart */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">KI-Portfolio vs. Benchmark (60 Tage)</h2>
            <span className="text-xs text-gray-500">Simuliert · $10.000 Startkapital</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={backtestData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B7280" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} interval={9} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="spPortfolio" name="DAX" stroke="#6B7280" strokeWidth={1.5} fill="url(#spGrad)" />
              <Area type="monotone" dataKey="aiPortfolio" name="Velocity KI" stroke="#3B82F6" strokeWidth={2} fill="url(#aiGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-3">
            <LegendItem color="#3B82F6" label="Velocity KI" />
            <LegendItem color="#6B7280" label="S&P 500" />
          </div>
        </div>

        {/* Sector Performance */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Sektor-Performance</h2>
          <div className="space-y-2">
            {MOCK_SECTORS.slice(0, 6).map(sector => (
              <div key={sector.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-32 truncate">{sector.name}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sector.changePct >= 0 ? 'bg-bull' : 'bg-bear'}`}
                    style={{ width: `${Math.min(Math.abs(sector.changePct) * 20, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-mono w-12 text-right ${sector.changePct >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {formatChangePct(sector.changePct, true)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Movers & News & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Movers */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Top Movers</h2>
            <Link to="/stocks" className="text-xs text-accent-blue hover:underline flex items-center gap-1">
              Alle <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Gewinner</p>
            {topMovers.gainers.map(s => <MoverRow key={s.symbol} stock={s} />)}
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-3 mb-2">Verlierer</p>
            {topMovers.losers.map(s => <MoverRow key={s.symbol} stock={s} />)}
          </div>
        </div>

        {/* Latest News */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Aktuelle Nachrichten</h2>
            <Link to="/news" className="text-xs text-accent-blue hover:underline flex items-center gap-1">
              Alle <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {news.slice(0, 4).map(article => (
              <div key={article.id} className="border-l-2 border-border pl-3 py-1">
                <span className={`text-xs font-semibold ${
                  article.sentiment === 'positive' ? 'text-bull' :
                  article.sentiment === 'negative' ? 'text-bear' : 'text-watch'
                }`}>
                  {article.sentiment === 'positive' ? '▲' : article.sentiment === 'negative' ? '▼' : '●'} {article.source}
                </span>
                <p className="text-xs text-gray-300 leading-snug mt-0.5 line-clamp-2">{article.title}</p>
                <div className="flex gap-1 mt-1">
                  {article.relatedSymbols.slice(0, 3).map(s => (
                    <span key={s} className="text-xs bg-bg-elevated text-gray-400 px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">KI-Empfehlungen</h2>
            <Link to="/recommendations" className="text-xs text-accent-blue hover:underline flex items-center gap-1">
              Alle <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {recommendations.map(rec => (
              <div key={rec.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-elevated">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">{rec.symbol}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                      rec.action === 'buy' ? 'bg-bull-dim text-bull-text' :
                      rec.action === 'sell' ? 'bg-bear-dim text-bear-text' : 'bg-watch-dim text-watch-text'
                    }`}>
                      {actionLabel(rec.action)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{rec.reasoning.split('.')[0]}.</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-mono font-bold text-white">{rec.confidence}%</p>
                  <p className="text-xs text-gray-500">Konfidenz</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, change, subtitle, icon, noChange }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 font-medium">{title}</p>
        <div className="text-gray-600">{icon}</div>
      </div>
      <p className="text-2xl font-bold font-mono text-white">{value}</p>
      {!noChange && change != null && (
        <p className={`text-xs font-medium mt-1 ${change >= 0 ? 'text-bull' : 'text-bear'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}% {subtitle}
        </p>
      )}
      {noChange && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function MoverRow({ stock }) {
  return (
    <div className="flex items-center gap-3 py-1.5 hover:bg-bg-elevated rounded-lg px-2 transition-colors">
      <div className="w-8 h-8 bg-bg-elevated rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-gray-300">{stock.symbol.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{stock.symbol}</p>
        <p className="text-xs text-gray-500 truncate">{stock.name}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-semibold text-white">{formatPriceCompact(stock.price)}</p>
        <p className={`text-xs font-mono ${stock.changePct >= 0 ? 'text-bull' : 'text-bear'}`}>
          {formatChangePct(stock.changePct, true)}
        </p>
      </div>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-bg-elevated rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-bg-card rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 h-64 bg-bg-card rounded-xl" />
        <div className="h-64 bg-bg-card rounded-xl" />
      </div>
    </div>
  )
}
