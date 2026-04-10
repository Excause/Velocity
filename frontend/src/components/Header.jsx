import { useEffect, useState } from 'react'
import { Menu, Settings, Bell, Search, TrendingUp, TrendingDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore.js'
import { MOCK_INDICES } from '../utils/mockData.js'
import { formatChangePct } from '../utils/formatters.js'
import { clsx } from 'clsx'

export default function Header() {
  const { toggleSidebar, openSettings } = useAppStore()
  const [indices, setIndices] = useState(MOCK_INDICES)
  const [search, setSearch] = useState('')
  const [time, setTime] = useState(new Date())
  const navigate = useNavigate()

  // Simulate live index updates
  useEffect(() => {
    const interval = setInterval(() => {
      setIndices(prev => prev.map(idx => {
        const variation = (Math.random() - 0.5) * 0.02
        const newValue = parseFloat((idx.value * (1 + variation * 0.01)).toFixed(2))
        const change = parseFloat((newValue - (idx.value - idx.change)).toFixed(2))
        const changePct = parseFloat(((change / (idx.value - idx.change)) * 100).toFixed(2))
        return { ...idx, value: newValue, change, changePct }
      }))
      setTime(new Date())
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/stocks?q=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  const isMarketOpen = () => {
    const now = new Date()
    const h = now.getHours()
    const day = now.getDay()
    return day >= 1 && day <= 5 && h >= 15 && h < 22 // NYSE hours in CET
  }

  return (
    <header className="bg-bg-secondary border-b border-border px-4 py-0 flex-shrink-0">
      {/* Ticker bar */}
      <div className="overflow-hidden border-b border-border py-2">
        <div className="flex gap-8 ticker-animate" style={{ width: 'max-content' }}>
          {[...indices, ...indices].map((idx, i) => (
            <div key={i} className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs font-medium text-gray-400">{idx.name}</span>
              <span className="text-xs font-mono font-semibold text-gray-200">
                {idx.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={clsx('text-xs font-mono', idx.changePct >= 0 ? 'text-bull' : 'text-bear')}>
                {idx.changePct >= 0 ? <TrendingUp size={10} className="inline mr-0.5" /> : <TrendingDown size={10} className="inline mr-0.5" />}
                {formatChangePct(idx.changePct)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main header row */}
      <div className="flex items-center gap-4 py-3">
        <button onClick={toggleSidebar} className="btn-ghost p-2 rounded-lg flex-shrink-0">
          <Menu size={20} />
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              type="text"
              placeholder="Aktie suchen (z. B. AAPL, Tesla...)"
              className="input-dark w-full pl-8 py-1.5 text-sm"
            />
          </div>
        </form>

        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
          {/* Market status */}
          <div className={clsx(
            'hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
            isMarketOpen() ? 'bg-bull-dim text-bull-text' : 'bg-gray-800 text-gray-500'
          )}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', isMarketOpen() ? 'bg-bull animate-pulse' : 'bg-gray-600')} />
            {isMarketOpen() ? 'Markt offen' : 'Markt geschlossen'}
          </div>

          {/* Time */}
          <span className="hidden md:block text-xs font-mono text-gray-500">
            {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>

          {/* Notifications */}
          <button className="btn-ghost p-2 rounded-lg relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent-blue rounded-full" />
          </button>

          {/* Settings */}
          <button onClick={openSettings} className="btn-ghost p-2 rounded-lg">
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
