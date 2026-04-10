import { useEffect, useState } from 'react'
import { Search, Filter, Clock, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { newsService } from '../services/newsService.js'
import { formatRelativeTime, formatDate } from '../utils/formatters.js'
import { clsx } from 'clsx'

const CATEGORIES = [
  { id: 'all', label: 'Alle' },
  { id: 'positive', label: 'Positiv' },
  { id: 'negative', label: 'Negativ' },
  { id: 'high', label: 'Hoher Impact' },
]

export default function News() {
  const [news, setNews] = useState([])
  const [trending, setTrending] = useState([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadData()
  }, [category])

  async function loadData() {
    setLoading(true)
    const [articles, topics] = await Promise.all([
      newsService.getNews({ category, limit: 30 }),
      newsService.getTrendingTopics(),
    ])
    setNews(articles)
    setTrending(topics)
    setLoading(false)
  }

  const filtered = news.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.summary?.toLowerCase().includes(search.toLowerCase()) ||
    n.relatedSymbols?.some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  const sentimentStats = {
    positive: news.filter(n => n.sentiment === 'positive').length,
    negative: news.filter(n => n.sentiment === 'negative').length,
    neutral: news.filter(n => n.sentiment === 'neutral').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">News & Ereignisanalyse</h1>
        <p className="text-sm text-gray-500 mt-0.5">KI-analysierte Finanznachrichten mit Sentiment-Bewertung</p>
      </div>

      {/* Sentiment Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-bull">{sentimentStats.positive}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <TrendingUp size={12} /> Positiv
          </p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-bear">{sentimentStats.negative}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <TrendingDown size={12} /> Negativ
          </p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-watch">{sentimentStats.neutral}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <Minus size={12} /> Neutral
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main feed */}
        <div className="xl:col-span-3 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Nachrichten suchen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-dark w-full pl-8"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={clsx(
                    'text-xs px-3 py-1.5 rounded-full font-medium transition-all',
                    category === cat.id
                      ? 'bg-accent-blue text-white'
                      : 'bg-bg-elevated text-gray-400 hover:text-gray-200'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* News list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 bg-bg-elevated rounded w-3/4 mb-2" />
                  <div className="h-3 bg-bg-elevated rounded w-full mb-1" />
                  <div className="h-3 bg-bg-elevated rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(article => (
                <NewsCard
                  key={article.id}
                  article={article}
                  isSelected={selected?.id === article.id}
                  onClick={() => setSelected(selected?.id === article.id ? null : article)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="card text-center py-12">
                  <p className="text-gray-500">Keine Nachrichten gefunden</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Trending topics */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-white mb-3">Trending Themen</h3>
            <div className="space-y-2.5">
              {trending.map((topic, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{topic.topic}</p>
                    <p className="text-xs text-gray-600">{topic.count} Artikel</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    topic.sentiment === 'positive' ? 'bg-bull' :
                    topic.sentiment === 'negative' ? 'bg-bear' : 'bg-watch'
                  }`} />
                </div>
              ))}
            </div>
          </div>

          {/* Article detail */}
          {selected && (
            <div className="card animate-slide-up">
              <h3 className="font-semibold text-white text-sm mb-2">{selected.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">{selected.summary}</p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock size={12} /> {formatRelativeTime(selected.publishedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Quelle:</span> {selected.source}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Impact:</span>
                  <span className={`font-semibold ${
                    selected.impact === 'high' ? 'text-bear' :
                    selected.impact === 'medium' ? 'text-watch' : 'text-gray-400'
                  }`}>
                    {selected.impact === 'high' ? 'Hoch' : selected.impact === 'medium' ? 'Mittel' : 'Niedrig'}
                  </span>
                </div>
              </div>
              {selected.relatedSymbols?.length > 0 && (
                <div className="flex gap-1 mt-3 flex-wrap">
                  {selected.relatedSymbols.map(s => (
                    <span key={s} className="text-xs bg-bg-elevated text-accent-blue px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-600 mt-3 italic">
                KI-Sentimentbewertung: {selected.sentimentScore > 0 ? '+' : ''}{(selected.sentimentScore * 100).toFixed(0)}%
              </p>
            </div>
          )}

          {/* AI Analysis note */}
          <div className="card bg-accent-blue/10 border-accent-blue/30">
            <h4 className="text-sm font-semibold text-accent-blue mb-1">KI-Analyse aktiv</h4>
            <p className="text-xs text-gray-400">
              Alle Artikel werden automatisch auf Marktrelevanz, Sentiment und Kursauswirkungen analysiert.
              Konfiguriere deinen Anthropic API-Key für tiefere Analysen.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewsCard({ article, isSelected, onClick }) {
  const SentimentIcon = article.sentiment === 'positive' ? TrendingUp :
    article.sentiment === 'negative' ? TrendingDown : Minus

  const sentimentColor = article.sentiment === 'positive' ? 'text-bull border-bull' :
    article.sentiment === 'negative' ? 'text-bear border-bear' : 'text-watch border-watch'

  return (
    <div
      onClick={onClick}
      className={clsx(
        'card cursor-pointer hover:border-gray-600 transition-all duration-150',
        isSelected ? 'border-accent-blue bg-bg-elevated' : ''
      )}
    >
      <div className="flex items-start gap-4">
        {/* Sentiment indicator */}
        <div className={clsx('mt-1 flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center', sentimentColor)}>
          <SentimentIcon size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-gray-500">{article.source}</span>
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-600">{formatRelativeTime(article.publishedAt)}</span>
            {article.impact === 'high' && (
              <span className="badge-bear text-xs">Hoher Impact</span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-gray-200 leading-snug mb-1.5">
            {article.title}
          </h3>

          {article.summary && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
              {article.summary}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {article.relatedSymbols?.map(s => (
              <span key={s} className="text-xs font-mono bg-bg-elevated text-gray-400 px-2 py-0.5 rounded">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <span className={clsx(
            'text-xs font-bold',
            article.sentiment === 'positive' ? 'text-bull' :
            article.sentiment === 'negative' ? 'text-bear' : 'text-watch'
          )}>
            {article.sentimentScore > 0 ? '+' : ''}{(article.sentimentScore * 100).toFixed(0)}%
          </span>
          <p className="text-xs text-gray-600 mt-0.5">Score</p>
        </div>
      </div>
    </div>
  )
}
