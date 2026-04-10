/**
 * AI Service – calls backend /api/ai
 * Falls back to mock data when backend is unreachable.
 */
import { api } from './api.js'
import { storageService } from './storageService.js'

export const aiService = {
  async getRecommendations(riskProfile = 'moderate') {
    try {
      const data = await api.get(`/ai/recommendations?riskProfile=${riskProfile}`)
      if (data && Array.isArray(data) && data.length) return data
    } catch {}
    // Fallback when DB is empty or backend unreachable
    return _getMockRecommendations(riskProfile)
  },

  async analyzeStock(symbol, _newsContext = []) {
    try {
      const data = await api.post('/ai/analyze', { symbol })
      if (data && data.action) return data
    } catch {}
    return getMockAnalysis(symbol)
  },

  async generateMorningReport(recommendations, topNews) {
    try {
      const data = await api.post('/ai/morning-report', {
        recommendations,
        news: topNews,
      })
      if (data && data.report) return data.report
    } catch {}
    return getMockMorningReport(recommendations, topNews)
  },

  saveFeedback(recommendationId, rating) {
    storageService.saveFeedback(recommendationId, rating)
  },
}

// ── Mock fallbacks ─────────────────────────────────────────────────────────────

function _getMockRecommendations(riskProfile) {
  const riskMap = {
    conservative: ['low'],
    moderate:     ['low', 'medium'],
    aggressive:   ['low', 'medium', 'high'],
  }
  const allowed = riskMap[riskProfile] || riskMap.moderate
  return MOCK_RECOMMENDATIONS.filter(r => allowed.includes(r.riskLevel))
}

const MOCK_RECOMMENDATIONS = [
  { id: 1, symbol: 'SAP',  action: 'buy',   confidence: 88, riskLevel: 'low',    currentPrice: 198.50, priceTarget: 225.00, upside: 13.3, stopLoss: 178.00, reasoning: 'SAP transformiert sich erfolgreich in eine Cloud-Plattform. KI-Integration in S/4HANA bietet nachhaltiges Wachstumspotenzial.', catalysts: ['Cloud-ARR', 'Business AI', 'RISE with SAP'], risks: ['IT-Budgetkürzungen', 'Migrations-Verzögerungen'], timeHorizon: '3-6M', generatedDate: new Date().toISOString().split('T')[0] },
  { id: 2, symbol: 'IFX',  action: 'buy',   confidence: 79, riskLevel: 'medium', currentPrice: 31.20,  priceTarget: 38.00,  upside: 21.8, stopLoss: 27.50, reasoning: 'Infineon positioniert sich ideal im Halbleiterzyklus-Aufschwung. SiC-Technologie ist ein Wachstumstreiber.',            catalysts: ['E-Mobilität', 'KI-Server', 'SiC'],         risks: ['Zyklusrisiko', 'China'],                          timeHorizon: '3-6M', generatedDate: new Date().toISOString().split('T')[0] },
  { id: 3, symbol: 'BAYN', action: 'sell',  confidence: 72, riskLevel: 'high',   currentPrice: 22.80,  priceTarget: 18.00,  upside: -21.1, stopLoss: 26.00, reasoning: 'Bayer bleibt durch Glyphosat-Verbindlichkeiten strukturell belastet. Pharmapipeline bietet keine kurzfristige Entlastung.', catalysts: ['Vergleich', 'Pipeline'],                    risks: ['Rechtsrisiken', 'Verschuldung', 'Pipeline'],      timeHorizon: '1-3M', generatedDate: new Date().toISOString().split('T')[0] },
  { id: 4, symbol: 'ALV',  action: 'buy',   confidence: 82, riskLevel: 'low',    currentPrice: 312.40, priceTarget: 360.00, upside: 15.2, stopLoss: 285.00, reasoning: 'Allianz überzeugt mit Rekordgewinnen und attraktiver Dividende. Defensiver DAX-Anker.',                                 catalysts: ['Dividende', 'Rückkauf', 'Zinsen'],          risks: ['Großkatastrophen', 'Regulierung'],                 timeHorizon: '6-12M', generatedDate: new Date().toISOString().split('T')[0] },
  { id: 5, symbol: 'VOW3', action: 'watch', confidence: 55, riskLevel: 'medium', currentPrice: 89.10,  priceTarget: 95.00,  upside: 6.6,  stopLoss: 80.00, reasoning: 'VW handelt günstig, aber strukturelle Herausforderungen in der E-Mobilität begrenzen das Potenzial.',                    catalysts: ['Sparprogramm', 'China', 'Software'],        risks: ['BYD-Wettbewerb', 'E-Auto-Nachfrage', 'Gewerkschaft'], timeHorizon: '3-6M', generatedDate: new Date().toISOString().split('T')[0] },
]

export function getMockAnalysis(symbol) {
  const analyses = {
    SAP:   { action: 'buy',   confidence: 88, reasoning: 'SAP transformiert sich erfolgreich in eine Cloud-Plattform. KI-Integration in S/4HANA bietet nachhaltiges Wachstumspotenzial.', catalysts: ['Cloud-ARR Wachstum', 'Business AI', 'RISE with SAP'], risks: ['IT-Budgetkürzungen', 'Migrations-Verzögerungen'], riskLevel: 'low',    timeHorizon: '3-6M' },
    IFX:   { action: 'buy',   confidence: 79, reasoning: 'Infineon positioniert sich ideal im Halbleiterzyklus-Aufschwung 2025. SiC-Technologie ist ein Wachstumstreiber.',            catalysts: ['E-Mobilität Erholung', 'KI-Server', 'SiC-Kapazitäten'], risks: ['Zyklusrisiko', 'China-Exposure'], riskLevel: 'medium', timeHorizon: '3-6M' },
    BAYN:  { action: 'sell',  confidence: 72, reasoning: 'Bayer bleibt durch Glyphosat-Verbindlichkeiten strukturell belastet. Pharmapipeline bietet keine kurzfristige Entlastung.', catalysts: ['Glyphosat-Vergleich', 'Pharma-Pipeline'], risks: ['Rechtsverbindlichkeiten', 'Verschuldung', 'Pipeline-Rückschläge'], riskLevel: 'high', timeHorizon: '1-3M' },
    ALV:   { action: 'buy',   confidence: 82, reasoning: 'Allianz überzeugt mit Rekordgewinnen und attraktiver Dividendenrendite. Defensiver DAX-Anker.',                            catalysts: ['Dividendenerhöhung', 'Aktienrückkauf', 'Zinsnormalisierung'], risks: ['Großkatastrophen', 'Regulierung'], riskLevel: 'low', timeHorizon: '6-12M' },
    VOW3:  { action: 'watch', confidence: 55, reasoning: 'VW handelt auf historisch günstiger Bewertung, aber strukturelle Herausforderungen begrenzen kurzfristiges Potenzial.',    catalysts: ['Sparprogramm', 'China-Erholung', 'Software-Integration'], risks: ['BYD-Wettbewerb', 'E-Auto-Nachfrage', 'Gewerkschaft'], riskLevel: 'medium', timeHorizon: '3-6M' },
  }
  return analyses[symbol] || {
    action: 'watch', confidence: 62,
    reasoning: 'Marktlage erfordert sorgfältige Beobachtung. DAX-Umfeld abhängig von EZB-Politik.',
    catalysts: ['EZB-Zinssenkungen', 'Konjunkturerholung', 'Sektor-Rotation'],
    risks:     ['Rezessionsrisiko Deutschland', 'Geopolitik', 'Energiepreise'],
    riskLevel: 'medium', timeHorizon: '3-6M',
  }
}

function getMockMorningReport(recommendations, _topNews) {
  const buyRecs = recommendations.filter(r => r.action === 'buy')
  const topRec  = buyRecs[0]
  const today   = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return `**Velocity DAX-Report** – ${today}

**Marktausblick:** Der DAX dürfte moderat fester eröffnen. EZB-Zinssenkungserwartungen stützen das Sentiment.

**Top-Empfehlung:** ${topRec ? `**${topRec.symbol}** (${topRec.action.toUpperCase()}) – ${topRec.reasoning?.split('.')[0]}.` : 'Defensive Sektoren bevorzugen.'} Konfidenz: ${topRec?.confidence || 70}%.

**Hauptrisiko heute:** Makrodaten und US-Handelsbilanz könnten für Volatilität sorgen.

*Diese Analyse basiert auf KI-generierten Signalen. Keine Anlageberatung.*`
}
