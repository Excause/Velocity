import { MOCK_RECOMMENDATIONS } from '../utils/mockData.js'
import { storageService } from './storageService.js'

export const aiService = {
  async getRecommendations(riskProfile = 'moderate') {
    // Filter by risk profile
    const riskMap = {
      conservative: ['low'],
      moderate: ['low', 'medium'],
      aggressive: ['low', 'medium', 'high'],
    }
    const allowedRisks = riskMap[riskProfile] || riskMap.moderate

    return MOCK_RECOMMENDATIONS.filter(r => allowedRisks.includes(r.riskLevel))
  },

  async analyzeStock(symbol, newsContext = []) {
    const settings = storageService.getSettings()
    const anthropicKey = settings.anthropicKey

    if (!anthropicKey) {
      return getMockAnalysis(symbol)
    }

    try {
      // Call Claude API via a simple fetch (note: in production, route through backend)
      const newsText = newsContext
        .slice(0, 5)
        .map(n => `- ${n.title}: ${n.summary}`)
        .join('\n')

      const prompt = `Du bist ein erfahrener Finanzanalyst. Analysiere die Aktie ${symbol} basierend auf folgenden aktuellen Nachrichten:

${newsText || 'Keine spezifischen Nachrichten verfügbar.'}

Gib eine strukturierte Analyse mit:
1. Handlungsempfehlung (Kaufen/Verkaufen/Beobachten)
2. Kurzfristige Prognose (1-3 Monate)
3. Hauptkatalysatoren
4. Hauptrisiken
5. Begründung (max. 3 Sätze)

Antworte auf Deutsch im JSON-Format.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) throw new Error(`API Error: ${response.status}`)

      const data = await response.json()
      const text = data.content[0].text

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) return JSON.parse(jsonMatch[0])
      } catch {}

      return { reasoning: text, action: 'watch', confidence: 60 }
    } catch (e) {
      console.warn('Claude API failed:', e.message)
      return getMockAnalysis(symbol)
    }
  },

  async generateMorningReport(recommendations, topNews) {
    const settings = storageService.getSettings()
    const anthropicKey = settings.anthropicKey

    if (!anthropicKey) {
      return getMockMorningReport(recommendations, topNews)
    }

    try {
      const recoText = recommendations
        .slice(0, 5)
        .map(r => `${r.symbol}: ${r.action.toUpperCase()} (Konfidenz: ${r.confidence}%)`)
        .join('\n')

      const newsText = topNews
        .slice(0, 5)
        .map(n => `- ${n.title}`)
        .join('\n')

      const prompt = `Erstelle einen prägnanten Börsenmorgen-Report auf Deutsch für Investoren.

Heutige KI-Empfehlungen:
${recoText}

Wichtigste Nachrichten:
${newsText}

Format: Kurzer Überblick (2-3 Sätze), Marktausblick, Top-Empfehlung mit Begründung.
Stil: Professionell, direkt, auf den Punkt.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) throw new Error()
      const data = await response.json()
      return data.content[0].text
    } catch {
      return getMockMorningReport(recommendations, topNews)
    }
  },

  saveFeedback(recommendationId, rating) {
    storageService.saveFeedback(recommendationId, rating)
  },
}

function getMockAnalysis(symbol) {
  const analyses = {
    NVDA: { action: 'buy', confidence: 91, reasoning: 'Starke KI-Chip-Nachfrage treibt Wachstum. Blackwell-Architektur setzt neuen Industriestandard.', catalysts: ['KI-Infrastruktur', 'Rechenzentrum-Ausbau'], risks: ['Exportbeschränkungen', 'Bewertung'] },
    AAPL: { action: 'watch', confidence: 72, reasoning: 'Solides Geschäftsmodell aber Innovationsdynamik verlangsamt sich. iPhone-Supercycle aussteht.', catalysts: ['Apple Intelligence', 'Services-Wachstum'], risks: ['China-Markt', 'Regulierung'] },
    TSLA: { action: 'watch', confidence: 58, reasoning: 'Hohes Risiko durch Margendruck und Rückrufe. FSD bleibt Hauptkatalysator.', catalysts: ['FSD', 'Robotaxi'], risks: ['Wettbewerb', 'Margen'] },
  }
  return analyses[symbol] || {
    action: 'watch',
    confidence: 65,
    reasoning: 'Marktlage erfordert sorgfältige Beobachtung. Diversifikation empfohlen.',
    catalysts: ['Branchentrends', 'Makroumfeld'],
    risks: ['Marktvolatilität', 'Makrorisiken'],
  }
}

function getMockMorningReport(recommendations, topNews) {
  const buyRecs = recommendations.filter(r => r.action === 'buy').slice(0, 2)
  const topRec = buyRecs[0]

  return `📊 **Velocity Morgen-Report** – ${new Date().toLocaleDateString('de-DE')}

Die asiatischen Märkte schlossen überwiegend positiv, die US-Futures deuten auf einen moderaten Aufwärtsstart hin. KI-Aktien bleiben der dominierende Sektor.

**Marktausblick:** Technologiewerte profitieren weiterhin von starker Quartalssaison. Fed-Signale für mögliche Zinssenkungen stützen das Sentiment. Energiesektor profitiert von OPEC+-Kürzungen.

**Top-Empfehlung heute:** ${topRec ? `${topRec.symbol} (${topRec.action.toUpperCase()}) – ${topRec.reasoning.split('.')[0]}.` : 'Markt beobachten, Absicherung empfohlen.'}

*Diese Analyse basiert auf KI-generierten Signalen. Bitte eigene Due Diligence durchführen.*`
}
