import { MOCK_NEWS } from '../utils/mockData.js'
import { storageService } from './storageService.js'

export const newsService = {
  async getNews(options = {}) {
    const { symbol, category = 'all', limit = 20 } = options
    const settings = storageService.getSettings()
    const newsApiKey = settings.newsApiKey

    if (newsApiKey) {
      try {
        const query = symbol ? `${symbol} stock` : 'stock market finance investment'
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=de&country=de&max=10&apikey=${newsApiKey}`
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
          const data = await res.json()
          if (data.articles?.length) {
            return data.articles.map((a, i) => ({
              id: i + 1000,
              title: a.title,
              source: a.source.name,
              publishedAt: a.publishedAt,
              sentiment: analyzeSentiment(a.title + ' ' + (a.description || '')),
              sentimentScore: 0,
              impact: 'medium',
              relatedSymbols: [],
              summary: a.description || a.title,
              url: a.url,
              imageUrl: a.image,
            }))
          }
        }
      } catch (e) {
        console.warn('News API failed, using mock data', e)
      }
    }

    // Filter mock news
    let news = [...MOCK_NEWS]
    if (symbol) {
      news = news.filter(n => n.relatedSymbols.includes(symbol))
    }
    if (category === 'positive') news = news.filter(n => n.sentiment === 'positive')
    if (category === 'negative') news = news.filter(n => n.sentiment === 'negative')

    return news.slice(0, limit)
  },

  async getNewsForSymbols(symbols) {
    const news = await this.getNews({ limit: 50 })
    return news.filter(n => n.relatedSymbols.some(s => symbols.includes(s)))
  },

  async getTrendingTopics() {
    return [
      { topic: 'Künstliche Intelligenz', count: 48, sentiment: 'positive' },
      { topic: 'Zinspolitik Fed', count: 32, sentiment: 'neutral' },
      { topic: 'GLP-1 Medikamente', count: 28, sentiment: 'positive' },
      { topic: 'Halbleiter-Nachfrage', count: 24, sentiment: 'positive' },
      { topic: 'Tesla Rückrufe', count: 18, sentiment: 'negative' },
      { topic: 'Cloud Computing', count: 22, sentiment: 'positive' },
    ]
  },
}

function analyzeSentiment(text) {
  const positive = ['steigt', 'wächst', 'übertriff', 'rekord', 'positiv', 'gewinn', 'stark', 'bullish', 'erhöht', 'durchbruch']
  const negative = ['fällt', 'verliert', 'rückruf', 'negativ', 'verlust', 'schwach', 'bearish', 'sinkt', 'krise', 'risiko']

  const lower = text.toLowerCase()
  let score = 0
  positive.forEach(w => { if (lower.includes(w)) score++ })
  negative.forEach(w => { if (lower.includes(w)) score-- })

  if (score > 0) return 'positive'
  if (score < 0) return 'negative'
  return 'neutral'
}
