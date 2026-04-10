import { useEffect, useState } from 'react'
import { Brain, ThumbsUp, ThumbsDown, Minus, ChevronDown, ChevronUp, Target, Shield, Clock, Loader2 } from 'lucide-react'
import { aiService } from '../services/aiService.js'
import { newsService } from '../services/newsService.js'
import { useAppStore } from '../store/appStore.js'
import { MOCK_STOCKS } from '../utils/mockData.js'
import {
  formatPriceCompact, formatChangePct, actionLabel, riskLabel,
  confidenceColor,
} from '../utils/formatters.js'
import { clsx } from 'clsx'

const RISK_PROFILES = [
  { id: 'conservative', label: 'Konservativ', desc: 'Stabile Unternehmen, geringe Volatilität' },
  { id: 'moderate', label: 'Moderat', desc: 'Ausgewogenes Risiko-Rendite-Verhältnis' },
  { id: 'aggressive', label: 'Aggressiv', desc: 'Maximales Wachstumspotenzial' },
]

export default function Recommendations() {
  const { settings } = useAppStore()
  const [riskProfile, setRiskProfile] = useState(settings.riskProfile || 'moderate')
  const [recommendations, setRecommendations] = useState([])
  const [morningReport, setMorningReport] = useState('')
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [feedback, setFeedback] = useState({})

  useEffect(() => {
    loadData()
  }, [riskProfile])

  async function loadData() {
    setLoading(true)
    const [recs, latestNews] = await Promise.all([
      aiService.getRecommendations(riskProfile),
      newsService.getNews({ limit: 10 }),
    ])
    setRecommendations(recs)
    setNews(latestNews)
    setLoading(false)
    generateReport(recs, latestNews)
  }

  async function generateReport(recs, latestNews) {
    setReportLoading(true)
    const report = await aiService.generateMorningReport(recs, latestNews)
    setMorningReport(report)
    setReportLoading(false)
  }

  function handleFeedback(recId, rating) {
    aiService.saveFeedback(recId, rating)
    setFeedback(prev => ({ ...prev, [recId]: rating }))
  }

  const buyRecs = recommendations.filter(r => r.action === 'buy')
  const sellRecs = recommendations.filter(r => r.action === 'sell')
  const watchRecs = recommendations.filter(r => r.action === 'watch')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">KI-Handlungsempfehlungen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Basierend auf Nachrichten, Marktdaten & historischen Kursbewegungen
          </p>
        </div>
        <div className="flex items-center gap-2 bg-accent-blue/10 border border-accent-blue/30 px-3 py-2 rounded-lg">
          <Brain size={16} className="text-accent-blue" />
          <span className="text-sm text-accent-blue font-medium">Claude KI aktiv</span>
        </div>
      </div>

      {/* Morning Report */}
      <div className="card bg-gradient-to-br from-bg-elevated to-bg-card border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-accent-blue rounded flex items-center justify-center">
            <Brain size={12} className="text-white" />
          </div>
          <h2 className="font-semibold text-white">KI Morgen-Report</h2>
          <span className="text-xs text-gray-500 ml-auto">{new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        {reportLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 size={14} className="animate-spin" />
            KI generiert Morgen-Report...
          </div>
        ) : (
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {morningReport}
          </div>
        )}
      </div>

      {/* Risk Profile Selector */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Risikoprofil</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {RISK_PROFILES.map(profile => (
            <button
              key={profile.id}
              onClick={() => setRiskProfile(profile.id)}
              className={clsx(
                'p-4 rounded-xl border text-left transition-all',
                riskProfile === profile.id
                  ? 'border-accent-blue bg-accent-blue/10'
                  : 'border-border bg-bg-card hover:border-gray-600'
              )}
            >
              <p className={`font-semibold text-sm ${riskProfile === profile.id ? 'text-accent-blue' : 'text-white'}`}>
                {profile.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{profile.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-bull">{buyRecs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Kaufen</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-watch">{watchRecs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Beobachten</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-bear">{sellRecs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Verkaufen</p>
        </div>
      </div>

      {/* Recommendations list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map(rec => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              isExpanded={expanded === rec.id}
              onToggle={() => setExpanded(expanded === rec.id ? null : rec.id)}
              userFeedback={feedback[rec.id]}
              onFeedback={(rating) => handleFeedback(rec.id, rating)}
            />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="card bg-gray-900 border-gray-700">
        <div className="flex items-start gap-3">
          <Shield size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-400">Risikohinweis:</strong> Diese KI-generierten Empfehlungen stellen keine Anlageberatung dar.
            Investitionen in Aktien sind mit Verlustrisiken verbunden. Bitte führe eigene Recherchen durch und konsultiere
            bei Bedarf einen zugelassenen Finanzberater. Vergangene Renditen sind kein Indikator für zukünftige Ergebnisse.
          </div>
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({ rec, isExpanded, onToggle, userFeedback, onFeedback }) {
  const stock = MOCK_STOCKS.find(s => s.symbol === rec.symbol)
  const actionColors = {
    buy: { bg: 'bg-bull-dim', text: 'text-bull-text', border: 'border-bull/30' },
    sell: { bg: 'bg-bear-dim', text: 'text-bear-text', border: 'border-bear/30' },
    watch: { bg: 'bg-watch-dim', text: 'text-watch-text', border: 'border-watch/30' },
  }
  const colors = actionColors[rec.action]

  return (
    <div className={clsx('card border transition-all', isExpanded ? 'border-gray-600' : 'border-border')}>
      {/* Header row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Symbol & action */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={clsx('w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border', colors.bg, colors.border)}>
            <span className={clsx('text-xs font-bold', colors.text)}>{rec.symbol}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={clsx('text-sm font-bold px-2 py-0.5 rounded font-mono', colors.bg, colors.text)}>
                {actionLabel(rec.action)}
              </span>
              <span className="text-sm font-semibold text-white">{rec.symbol}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{stock?.name}</p>
          </div>
        </div>

        {/* Price & target */}
        <div className="text-center hidden sm:block">
          <p className="text-xs text-gray-500">Aktuell</p>
          <p className="font-mono font-bold text-white text-sm">{formatPriceCompact(rec.currentPrice)}</p>
        </div>
        <div className="text-center hidden sm:block">
          <p className="text-xs text-gray-500">Kursziel</p>
          <p className="font-mono font-bold text-sm"
            style={{ color: rec.upside >= 0 ? '#10B981' : '#EF4444' }}>
            {formatPriceCompact(rec.priceTarget)}
          </p>
        </div>
        <div className="text-center hidden md:block">
          <p className="text-xs text-gray-500">Upside</p>
          <p className={`font-mono font-bold text-sm ${rec.upside >= 0 ? 'text-bull' : 'text-bear'}`}>
            {rec.upside >= 0 ? '+' : ''}{rec.upside.toFixed(1)}%
          </p>
        </div>

        {/* Confidence */}
        <div className="text-center">
          <p className="text-xs text-gray-500">Konfidenz</p>
          <p className={`font-mono font-bold text-sm ${confidenceColor(rec.confidence)}`}>
            {rec.confidence}%
          </p>
        </div>

        {/* Risk */}
        <div className="hidden sm:block text-center">
          <p className="text-xs text-gray-500">Risiko</p>
          <p className="text-xs font-semibold text-gray-300">{riskLabel(rec.riskLevel)}</p>
        </div>

        {/* Expand */}
        <button onClick={onToggle} className="btn-ghost p-2 rounded-lg ml-auto">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4 animate-slide-up">
          {/* Meta */}
          <div className="flex gap-4 flex-wrap text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> Zeithorizont: {rec.timeHorizon}
            </span>
            <span className="flex items-center gap-1.5">
              <Target size={12} /> Kursziel: {formatPriceCompact(rec.priceTarget)} ({rec.upside >= 0 ? '+' : ''}{rec.upside.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <Shield size={12} /> Risiko: {riskLabel(rec.riskLevel)}
            </span>
          </div>

          {/* Reasoning */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">KI-Begründung</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{rec.reasoning}</p>
          </div>

          {/* News impact */}
          <div className="bg-bg-elevated rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-400 mb-1">Nachrichtenimpact</p>
            <p className="text-xs text-gray-400">{rec.newsImpact}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Catalysts */}
            <div>
              <h4 className="text-xs font-semibold text-bull uppercase tracking-wider mb-2">Katalysatoren</h4>
              <ul className="space-y-1">
                {rec.catalysts.map((c, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-bull mt-0.5">+</span> {c}
                  </li>
                ))}
              </ul>
            </div>
            {/* Risks */}
            <div>
              <h4 className="text-xs font-semibold text-bear uppercase tracking-wider mb-2">Risiken</h4>
              <ul className="space-y-1">
                {rec.risks.map((r, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-bear mt-0.5">−</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>KI-Konfidenz</span>
              <span className={confidenceColor(rec.confidence)}>{rec.confidence}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${rec.confidence}%`,
                  backgroundColor: rec.confidence >= 80 ? '#10B981' : rec.confidence >= 60 ? '#F59E0B' : '#EF4444',
                }}
              />
            </div>
          </div>

          {/* User Feedback */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <span className="text-xs text-gray-500">War diese Empfehlung hilfreich?</span>
            <div className="flex gap-2">
              <button
                onClick={() => onFeedback('good')}
                className={clsx(
                  'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all',
                  userFeedback === 'good'
                    ? 'bg-bull-dim border-bull text-bull'
                    : 'border-border text-gray-500 hover:border-bull hover:text-bull'
                )}
              >
                <ThumbsUp size={12} /> Gut
              </button>
              <button
                onClick={() => onFeedback('neutral')}
                className={clsx(
                  'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all',
                  userFeedback === 'neutral'
                    ? 'bg-watch-dim border-watch text-watch'
                    : 'border-border text-gray-500 hover:border-watch hover:text-watch'
                )}
              >
                <Minus size={12} /> Neutral
              </button>
              <button
                onClick={() => onFeedback('bad')}
                className={clsx(
                  'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all',
                  userFeedback === 'bad'
                    ? 'bg-bear-dim border-bear text-bear'
                    : 'border-border text-gray-500 hover:border-bear hover:text-bear'
                )}
              >
                <ThumbsDown size={12} /> Schlecht
              </button>
            </div>
            {userFeedback && (
              <span className="text-xs text-gray-600 ml-auto">Feedback gespeichert · Verbessert KI</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
