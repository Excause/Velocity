import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { FlaskConical, TrendingUp, TrendingDown, Plus, Minus, RefreshCw, Info } from 'lucide-react'
import { useAppStore } from '../store/appStore.js'
import { MOCK_STOCKS, generateBacktestData } from '../utils/mockData.js'
import { formatPriceCompact, formatChangePct } from '../utils/formatters.js'
import { clsx } from 'clsx'

const TABS = [
  { id: 'portfolio', label: 'Mein Portfolio' },
  { id: 'trade',     label: 'Handeln'        },
  { id: 'backtest',  label: 'Backtesting'    },
  { id: 'history',   label: 'Transaktionen'  },
]

const START_CAPITAL = 10_000

function fmtEur(value) {
  if (value == null) return '—'
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function Simulator() {
  const { portfolio, buyStock, sellStock, resetPortfolio, getPortfolioValue } = useAppStore()
  const [tab,         setTab]         = useState('portfolio')
  const [backtestData, setBacktestData] = useState([])
  const [btDays,      setBtDays]      = useState(90)
  const [tradeSymbol, setTradeSymbol] = useState(MOCK_STOCKS[0]?.symbol || 'SAP')
  const [tradeShares, setTradeShares] = useState(1)
  const [tradeType,   setTradeType]   = useState('buy')
  const [tradeResult, setTradeResult] = useState(null)
  const [searchStock, setSearchStock] = useState('')

  useEffect(() => {
    setBacktestData(generateBacktestData(START_CAPITAL, btDays))
  }, [btDays])

  const portfolioValue     = getPortfolioValue()
  const startingCapital    = portfolio.startingCapital || START_CAPITAL
  const portfolioReturn    = portfolioValue - startingCapital
  const portfolioReturnPct = startingCapital > 0 ? (portfolioReturn / startingCapital) * 100 : 0

  const selectedStock = MOCK_STOCKS.find(s => s.symbol === tradeSymbol) || MOCK_STOCKS[0]
  const tradeCost     = tradeShares * (selectedStock?.price || 0)

  const positionsWithValue = portfolio.positions.map(pos => {
    const stock        = MOCK_STOCKS.find(s => s.symbol === pos.symbol)
    const currentPrice = stock?.price || pos.avgPrice
    const currentValue = currentPrice * pos.shares
    const costBasis    = pos.avgPrice * pos.shares
    const pnl          = currentValue - costBasis
    const pnlPct       = costBasis > 0 ? (pnl / costBasis) * 100 : 0
    return { ...pos, currentPrice, currentValue, costBasis, pnl, pnlPct, stockName: stock?.name }
  })

  const btFinal   = backtestData[backtestData.length - 1]
  const aiReturn  = btFinal ? ((btFinal.aiPortfolio  - START_CAPITAL) / START_CAPITAL) * 100 : 0
  const daxReturn = btFinal ? ((btFinal.spPortfolio  - START_CAPITAL) / START_CAPITAL) * 100 : 0
  const rndReturn = btFinal ? ((btFinal.userPortfolio - START_CAPITAL) / START_CAPITAL) * 100 : 0

  function handleTrade() {
    const fn     = tradeType === 'buy' ? buyStock : sellStock
    const result = fn(tradeSymbol, parseFloat(tradeShares), selectedStock.price)
    setTradeResult(result)
    setTimeout(() => setTradeResult(null), 4000)
  }

  const filteredStocks = MOCK_STOCKS.filter(s =>
    !searchStock ||
    s.symbol.toLowerCase().includes(searchStock.toLowerCase()) ||
    s.name.toLowerCase().includes(searchStock.toLowerCase())
  ).slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FlaskConical size={24} className="text-accent-blue" />
            Simulator & Backtesting
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Teste Strategien mit virtuellem Kapital ohne Risiko</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="card p-3 text-center min-w-36">
            <p className="text-xs text-gray-500">Portfolio-Wert</p>
            <p className="text-lg font-bold font-mono text-white">{fmtEur(portfolioValue)}</p>
            <p className={`text-xs font-mono ${portfolioReturnPct >= 0 ? 'text-bull' : 'text-bear'}`}>
              {portfolioReturnPct >= 0 ? '+' : ''}{portfolioReturnPct.toFixed(2)}%
            </p>
          </div>
          <button
            onClick={() => { if (confirm('Portfolio zurücksetzen?')) resetPortfolio() }}
            className="btn-ghost text-xs flex items-center gap-1.5 text-bear"
          >
            <RefreshCw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-card border border-border rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex-1 text-sm font-medium py-2 rounded-lg transition-all',
              tab === t.id ? 'bg-accent-blue text-white' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Portfolio Tab ── */}
      {tab === 'portfolio' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500">Startkapital</p>
              <p className="text-xl font-bold font-mono text-white mt-1">{fmtEur(START_CAPITAL)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500">Aktueller Wert</p>
              <p className="text-xl font-bold font-mono text-white mt-1">{fmtEur(portfolioValue)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500">G&V gesamt</p>
              <p className={`text-xl font-bold font-mono mt-1 ${portfolioReturn >= 0 ? 'text-bull' : 'text-bear'}`}>
                {portfolioReturn >= 0 ? '+' : ''}{fmtEur(portfolioReturn)}
              </p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500">Verfügbares Kapital</p>
              <p className="text-xl font-bold font-mono text-white mt-1">{fmtEur(portfolio.cash)}</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-white mb-4">Positionen</h3>
            {positionsWithValue.length === 0 ? (
              <div className="text-center py-12">
                <FlaskConical size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Noch keine Positionen</p>
                <p className="text-gray-600 text-xs mt-1">Kaufe deine erste Aktie im „Handeln"-Reiter</p>
                <button onClick={() => setTab('trade')} className="btn-primary mt-4 text-sm">Jetzt handeln</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-border">
                      <th className="text-left pb-2">Symbol</th>
                      <th className="text-right pb-2">Stücke</th>
                      <th className="text-right pb-2">Ø Kauf</th>
                      <th className="text-right pb-2">Kurs</th>
                      <th className="text-right pb-2">Wert</th>
                      <th className="text-right pb-2">G&V</th>
                      <th className="text-right pb-2">G&V %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionsWithValue.map(pos => (
                      <tr key={pos.symbol} className="border-b border-border/30 hover:bg-bg-elevated transition-colors">
                        <td className="py-2.5">
                          <p className="font-bold font-mono text-white">{pos.symbol}</p>
                          <p className="text-xs text-gray-500">{pos.stockName}</p>
                        </td>
                        <td className="text-right font-mono text-gray-300">{pos.shares}</td>
                        <td className="text-right font-mono text-gray-300">{formatPriceCompact(pos.avgPrice)}</td>
                        <td className="text-right font-mono text-white">{formatPriceCompact(pos.currentPrice)}</td>
                        <td className="text-right font-mono text-white">{fmtEur(pos.currentValue)}</td>
                        <td className={`text-right font-mono font-semibold ${pos.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                          {pos.pnl >= 0 ? '+' : ''}{fmtEur(pos.pnl)}
                        </td>
                        <td className={`text-right font-mono font-semibold ${pos.pnlPct >= 0 ? 'text-bull' : 'text-bear'}`}>
                          {formatChangePct(pos.pnlPct, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Trade Tab ── */}
      {tab === 'trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-white mb-3">Aktie auswählen</h3>
            <input
              type="text"
              placeholder="Symbol oder Name..."
              value={searchStock}
              onChange={e => setSearchStock(e.target.value)}
              className="input-dark w-full mb-3"
            />
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {filteredStocks.map(stock => (
                <div
                  key={stock.symbol}
                  onClick={() => setTradeSymbol(stock.symbol)}
                  className={clsx(
                    'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all',
                    tradeSymbol === stock.symbol ? 'bg-accent-blue/20 border border-accent-blue/50' : 'hover:bg-bg-elevated'
                  )}
                >
                  <div className="w-8 h-8 bg-bg-elevated rounded flex items-center justify-center text-xs font-bold text-gray-300">
                    {stock.symbol.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{stock.symbol}</p>
                    <p className="text-xs text-gray-500 truncate">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-white">{formatPriceCompact(stock.price)}</p>
                    <p className={`text-xs font-mono ${stock.changePct >= 0 ? 'text-bull' : 'text-bear'}`}>
                      {formatChangePct(stock.changePct, true)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-white mb-4">Order aufgeben</h3>

            {selectedStock && (
              <div className="bg-bg-elevated rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{selectedStock.symbol}</p>
                    <p className="text-xs text-gray-500">{selectedStock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-mono text-white">{formatPriceCompact(selectedStock.price)}</p>
                    <p className={`text-xs font-mono ${selectedStock.changePct >= 0 ? 'text-bull' : 'text-bear'}`}>
                      {formatChangePct(selectedStock.changePct, true)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setTradeType('buy')}
                className={clsx('py-3 rounded-lg font-semibold text-sm transition-all',
                  tradeType === 'buy' ? 'bg-bull text-white' : 'bg-bg-elevated text-gray-400 hover:text-white')}
              >Kaufen</button>
              <button
                onClick={() => setTradeType('sell')}
                className={clsx('py-3 rounded-lg font-semibold text-sm transition-all',
                  tradeType === 'sell' ? 'bg-bear text-white' : 'bg-bg-elevated text-gray-400 hover:text-white')}
              >Verkaufen</button>
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-2 block">Anzahl Aktien</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTradeShares(Math.max(1, tradeShares - 1))}
                  className="w-10 h-10 bg-bg-elevated rounded-lg flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                ><Minus size={16} /></button>
                <input
                  type="number" min="1" value={tradeShares}
                  onChange={e => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input-dark flex-1 text-center text-xl font-bold font-mono"
                />
                <button
                  onClick={() => setTradeShares(tradeShares + 1)}
                  className="w-10 h-10 bg-bg-elevated rounded-lg flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                ><Plus size={16} /></button>
              </div>
            </div>

            <div className="bg-bg-elevated rounded-lg p-3 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Stückpreis</span>
                <span className="font-mono text-white">{formatPriceCompact(selectedStock?.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Anzahl</span>
                <span className="font-mono text-white">{tradeShares}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span className="text-gray-300">Gesamt</span>
                <span className="font-mono text-white">{fmtEur(tradeCost)}</span>
              </div>
              {tradeType === 'buy' && (
                <p className="text-xs text-gray-500">
                  Verfügbar: {fmtEur(portfolio.cash)}
                  {tradeCost > portfolio.cash && <span className="text-bear ml-2">⚠ Nicht genügend Kapital</span>}
                </p>
              )}
            </div>

            <button
              onClick={handleTrade}
              disabled={tradeType === 'buy' && tradeCost > portfolio.cash}
              className={clsx('w-full py-3 rounded-xl font-bold text-white transition-all',
                tradeType === 'buy'
                  ? 'bg-bull hover:bg-bull/80 disabled:opacity-40 disabled:cursor-not-allowed'
                  : 'bg-bear hover:bg-bear/80')}
            >
              {tradeType === 'buy' ? 'Kaufen' : 'Verkaufen'} · {fmtEur(tradeCost)}
            </button>

            {tradeResult && (
              <div className={clsx('mt-3 p-3 rounded-lg text-sm font-medium animate-slide-up',
                tradeResult.success ? 'bg-bull-dim text-bull-text' : 'bg-bear-dim text-bear-text')}>
                {tradeResult.success
                  ? `Order erfolgreich!${tradeResult.pnl != null ? ` G&V: ${tradeResult.pnl >= 0 ? '+' : ''}${fmtEur(tradeResult.pnl)}` : ''}`
                  : `Fehler: ${tradeResult.error}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Backtest Tab ── */}
      {tab === 'backtest' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
              <h3 className="font-semibold text-white">Velocity KI vs. DAX vs. Zufälliger Anleger</h3>
              <div className="flex gap-2">
                {[30, 60, 90, 180].map(d => (
                  <button key={d} onClick={() => setBtDays(d)}
                    className={clsx('text-xs px-3 py-1 rounded font-medium transition-all',
                      btDays === d ? 'bg-accent-blue text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-bg-elevated')}
                  >{d}T</button>
                ))}
              </div>
            </div>

            <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-lg p-3 mb-4 flex items-start gap-2">
              <Info size={14} className="text-accent-blue mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-400">
                Diese Simulation zeigt: <strong className="text-white">Wenn du den Velocity KI-Empfehlungen gefolgt wärst</strong>, wie hätte sich {fmtEur(START_CAPITAL)} Startkapital entwickelt – verglichen mit dem DAX und einer zufälligen Anlagestrategie.
              </p>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={backtestData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="aiG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="daxG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B7280" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="usrG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(backtestData.length / 6)} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}k €`} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-bg-elevated border border-border rounded-lg p-3 text-xs shadow-xl">
                      <p className="text-gray-400 mb-2">{label}</p>
                      {payload.map((p, i) => (
                        <div key={i} className="flex justify-between gap-4 mb-1">
                          <span style={{ color: p.color }}>{p.name}</span>
                          <span className="font-mono font-bold text-white">{fmtEur(p.value)}</span>
                        </div>
                      ))}
                    </div>
                  )
                }} />
                <ReferenceLine y={START_CAPITAL} stroke="#374151" strokeDasharray="4 4" label={{ value: 'Startkapital', fill: '#6B7280', fontSize: 10 }} />
                <Area type="monotone" dataKey="userPortfolio" name="Zufällig"    stroke="#F59E0B" strokeWidth={1.5} fill="url(#usrG)" />
                <Area type="monotone" dataKey="spPortfolio"   name="DAX"         stroke="#6B7280" strokeWidth={1.5} fill="url(#daxG)" />
                <Area type="monotone" dataKey="aiPortfolio"   name="Velocity KI" stroke="#3B82F6" strokeWidth={2.5} fill="url(#aiG)" />
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex gap-6 mt-3 flex-wrap">
              {[
                { label: 'Velocity KI', value: aiReturn,  color: '#3B82F6' },
                { label: 'DAX',         value: daxReturn, color: '#6B7280' },
                { label: 'Zufällig',    value: rndReturn, color: '#F59E0B' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-0.5 rounded" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-400">{item.label}:</span>
                  <span className={`text-xs font-mono font-bold ${item.value >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {item.value >= 0 ? '+' : ''}{item.value.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card text-center border-accent-blue/30 bg-accent-blue/5">
              <p className="text-xs text-gray-500 mb-1">Velocity KI</p>
              <p className={`text-2xl font-bold font-mono ${aiReturn >= 0 ? 'text-bull' : 'text-bear'}`}>
                {aiReturn >= 0 ? '+' : ''}{aiReturn.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {aiReturn >= 0 ? '+' : ''}{fmtEur((START_CAPITAL * (1 + aiReturn / 100)) - START_CAPITAL)} Gewinn
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">DAX Benchmark</p>
              <p className={`text-2xl font-bold font-mono ${daxReturn >= 0 ? 'text-bull' : 'text-bear'}`}>
                {daxReturn >= 0 ? '+' : ''}{daxReturn.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Markt-Benchmark</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">KI vs. DAX</p>
              <p className={`text-2xl font-bold font-mono ${(aiReturn - daxReturn) >= 0 ? 'text-bull' : 'text-bear'}`}>
                {(aiReturn - daxReturn) >= 0 ? '+' : ''}{(aiReturn - daxReturn).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Outperformance</p>
            </div>
          </div>
        </div>
      )}

      {/* ── History Tab ── */}
      {tab === 'history' && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Transaktionshistorie</h3>
          {portfolio.transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Noch keine Transaktionen</p>
              <button onClick={() => setTab('trade')} className="btn-primary mt-4 text-sm">Erste Order aufgeben</button>
            </div>
          ) : (
            <div className="space-y-2">
              {portfolio.transactions.map(tx => (
                <div key={tx.id} className={clsx(
                  'flex items-center gap-4 p-3 rounded-lg border',
                  tx.type === 'buy' ? 'bg-bull-dim/30 border-bull/20' : 'bg-bear-dim/30 border-bear/20'
                )}>
                  <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    tx.type === 'buy' ? 'bg-bull text-white' : 'bg-bear text-white')}>
                    {tx.type === 'buy' ? <Plus size={14} /> : <Minus size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{tx.symbol}</span>
                      <span className={`text-xs font-semibold ${tx.type === 'buy' ? 'text-bull' : 'text-bear'}`}>
                        {tx.type === 'buy' ? 'KAUF' : 'VERKAUF'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {tx.shares} Aktien à {formatPriceCompact(tx.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-white">{fmtEur(tx.total)}</p>
                    {tx.pnl != null && (
                      <p className={`text-xs font-mono ${tx.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {tx.pnl >= 0 ? '+' : ''}{fmtEur(tx.pnl)} G&V
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      {new Date(tx.timestamp).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
