import { MOCK_NEWS } from '../utils/mockData.js'
import { storageService } from './storageService.js'

export const newsService = {
  async getNews(options = {}) {
    const { symbol, category = 'all', limit = 20 } = options
    const settings = storageService.getSettings()
    const newsApiKey = settings.newsApiKey

    if (newsApiKey) {
      try {
        // GNews API – deutsche Finanznachrichten
        const query = symbol
          ? `${symbol} Aktie Börse`
          : 'DAX Börse Aktien Deutschland Finanzen'
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=de&country=de&max=20&apikey=${newsApiKey}`
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
        if (res.ok) {
          const data = await res.json()
          if (data.articles?.length) {
            return data.articles.map((a, i) => ({
              id: i + 1000,
              title: a.title,
              source: a.source.name,
              publishedAt: a.publishedAt,
              sentiment: detectSentiment(a.title + ' ' + (a.description || '')),
              sentimentScore: 0,
              impact: detectImpact(a.title),
              relatedSymbols: extractSymbols(a.title + ' ' + (a.description || '')),
              summary: a.description || a.title,
              url: a.url,
              imageUrl: a.image,
            }))
          }
        }
      } catch (e) {
        console.warn('GNews API nicht erreichbar, Demo-Daten werden verwendet:', e)
      }
    }

    // Demo-Fallback
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
      { topic: 'SAP Cloud-Wachstum',          count: 42, sentiment: 'positive' },
      { topic: 'EZB Zinsentscheid',            count: 38, sentiment: 'positive' },
      { topic: 'Bayer Glyphosat-Klagen',       count: 31, sentiment: 'negative' },
      { topic: 'Airbus Produktionserhöhung',   count: 28, sentiment: 'positive' },
      { topic: 'Volkswagen Restrukturierung',  count: 24, sentiment: 'neutral'  },
      { topic: 'Commerzbank Übernahme',        count: 22, sentiment: 'positive' },
      { topic: 'DAX-Rekord',                   count: 20, sentiment: 'positive' },
      { topic: 'Deutsche Bank Quartalszahlen', count: 17, sentiment: 'neutral'  },
    ]
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectSentiment(text) {
  const t = text.toLowerCase()
  const pos = ['steigt', 'wächst', 'übertrifft', 'rekord', 'gewinn', 'stark', 'anhebt', 'erhöht', 'kaufempfehlung', 'positiv', 'zulegt', 'profitiert', 'durchbruch']
  const neg = ['fällt', 'verliert', 'rückruf', 'verlust', 'schwach', 'sinkt', 'krise', 'klage', 'pleite', 'warnt', 'senkt', 'enttäuscht', 'risiko', 'gefährdet']
  let score = 0
  pos.forEach(w => { if (t.includes(w)) score++ })
  neg.forEach(w => { if (t.includes(w)) score-- })
  if (score > 0) return 'positive'
  if (score < 0) return 'negative'
  return 'neutral'
}

function detectImpact(title) {
  const t = title.toLowerCase()
  if (t.includes('milliard') || t.includes('rekord') || t.includes('ezb') || t.includes('bundesbank') || t.includes('übernahme')) return 'high'
  if (t.includes('million') || t.includes('quartal') || t.includes('prognose')) return 'medium'
  return 'low'
}

// Mapped bekannte Unternehmen auf ihre Ticker-Symbole
const SYMBOL_MAP = {
  'sap':               'SAP',
  'siemens':           'SIE',
  'allianz':           'ALV',
  'telekom':           'DTE',
  'deutsche telekom':  'DTE',
  'infineon':          'IFX',
  'bmw':               'BMW',
  'mercedes':          'MBG',
  'daimler':           'MBG',
  'basf':              'BAS',
  'bayer':             'BAYN',
  'volkswagen':        'VOW3',
  'vw':                'VOW3',
  'airbus':            'AIR',
  'linde':             'LIN',
  'adidas':            'ADS',
  'rwe':               'RWE',
  'e.on':              'EOAN',
  'dhl':               'DHL',
  'deutsche post':     'DHL',
  'hannover rück':     'HNR1',
  'merck':             'MRK',
  'beiersdorf':        'BEI',
  'henkel':            'HENKA',
  'vonovia':           'VNA',
  'continental':       'CON',
  'fresenius':         'FRE',
  'mtu':               'MTX',
  'deutsche bank':     'DBK',
  'commerzbank':       'CBK',
  'porsche':           'P911',
  'daimler truck':     'DTG',
  'heidelberg':        'HDMG',
  'münchener rück':    'MUV2',
  'munich re':         'MUV2',
}

function extractSymbols(text) {
  const t = text.toLowerCase()
  const found = new Set()
  for (const [keyword, symbol] of Object.entries(SYMBOL_MAP)) {
    if (t.includes(keyword)) found.add(symbol)
  }
  return [...found].slice(0, 5)
}
