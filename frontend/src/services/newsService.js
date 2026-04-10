/**
 * News Service – calls backend /api/news
 * Falls back to mock data when backend is unreachable.
 */
import { api } from './api.js'
import { MOCK_NEWS } from '../utils/mockData.js'

export const newsService = {
  async getNews(options = {}) {
    const { symbol, category = 'all', limit = 20 } = options

    try {
      const params = new URLSearchParams({ limit })
      if (symbol) params.set('symbol', symbol)
      const data = await api.get(`/news?${params}`)
      if (data && Array.isArray(data) && data.length) {
        return _enrichNews(data, category)
      }
    } catch {}

    // Mock fallback
    let news = [...MOCK_NEWS]
    if (symbol)            news = news.filter(n => n.relatedSymbols?.includes(symbol))
    if (category === 'positive') news = news.filter(n => n.sentiment === 'positive')
    if (category === 'negative') news = news.filter(n => n.sentiment === 'negative')
    return news.slice(0, limit)
  },

  async getNewsForSymbols(symbols) {
    const news = await this.getNews({ limit: 50 })
    return news.filter(n => n.relatedSymbols?.some(s => symbols.includes(s)))
  },

  async getTrendingTopics() {
    try {
      const data = await api.get('/news/trending')
      if (data && Array.isArray(data) && data.length) return data
    } catch {}
    return [
      { topic: 'SAP Cloud-Wachstum',         count: 42, sentiment: 'positive' },
      { topic: 'EZB Zinsentscheid',           count: 38, sentiment: 'positive' },
      { topic: 'Bayer Glyphosat-Klagen',      count: 31, sentiment: 'negative' },
      { topic: 'Airbus Produktionserhöhung',  count: 28, sentiment: 'positive' },
      { topic: 'Volkswagen Restrukturierung', count: 24, sentiment: 'neutral'  },
    ]
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _enrichNews(articles, category) {
  const enriched = articles.map(a => ({
    ...a,
    sentiment:      a.sentiment      || detectSentiment(a.title + ' ' + (a.summary || '')),
    impact:         a.impact         || detectImpact(a.title || ''),
    relatedSymbols: a.relatedSymbols || extractSymbols(a.title + ' ' + (a.summary || '')),
  }))

  if (category === 'positive') return enriched.filter(n => n.sentiment === 'positive')
  if (category === 'negative') return enriched.filter(n => n.sentiment === 'negative')
  return enriched
}

function detectSentiment(text) {
  const t   = text.toLowerCase()
  const pos = ['steigt', 'wächst', 'übertrifft', 'rekord', 'gewinn', 'stark', 'anhebt', 'erhöht', 'kaufempfehlung', 'positiv', 'zulegt', 'profitiert', 'durchbruch']
  const neg = ['fällt', 'verliert', 'rückruf', 'verlust', 'schwach', 'sinkt', 'krise', 'klage', 'pleite', 'warnt', 'senkt', 'enttäuscht', 'risiko', 'gefährdet']
  let score = 0
  pos.forEach(w => { if (t.includes(w)) score++ })
  neg.forEach(w => { if (t.includes(w)) score-- })
  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'
}

function detectImpact(title) {
  const t = title.toLowerCase()
  if (t.includes('milliard') || t.includes('rekord') || t.includes('ezb') || t.includes('übernahme')) return 'high'
  if (t.includes('million')  || t.includes('quartal') || t.includes('prognose')) return 'medium'
  return 'low'
}

const SYMBOL_MAP = {
  'sap': 'SAP', 'siemens': 'SIE', 'allianz': 'ALV', 'telekom': 'DTE',
  'deutsche telekom': 'DTE', 'infineon': 'IFX', 'bmw': 'BMW', 'mercedes': 'MBG',
  'daimler': 'MBG', 'basf': 'BAS', 'bayer': 'BAYN', 'volkswagen': 'VOW3',
  'vw': 'VOW3', 'airbus': 'AIR', 'linde': 'LIN', 'adidas': 'ADS', 'rwe': 'RWE',
  'e.on': 'EOAN', 'dhl': 'DHL', 'deutsche post': 'DHL', 'hannover rück': 'HNR1',
  'merck': 'MRK', 'beiersdorf': 'BEI', 'henkel': 'HENKA', 'vonovia': 'VNA',
  'continental': 'CON', 'fresenius': 'FRE', 'mtu': 'MTX', 'deutsche bank': 'DBK',
  'commerzbank': 'CBK', 'porsche': 'P911', 'daimler truck': 'DTG', 'münchen re': 'MUV2',
}

function extractSymbols(text) {
  const t    = text.toLowerCase()
  const found = new Set()
  for (const [keyword, symbol] of Object.entries(SYMBOL_MAP)) {
    if (t.includes(keyword)) found.add(symbol)
  }
  return [...found].slice(0, 5)
}
