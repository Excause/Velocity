import { MOCK_RECOMMENDATIONS } from '../utils/mockData.js'
import { storageService } from './storageService.js'

export const aiService = {
  async getRecommendations(riskProfile = 'moderate') {
    const riskMap = {
      conservative: ['low'],
      moderate:     ['low', 'medium'],
      aggressive:   ['low', 'medium', 'high'],
    }
    const allowed = riskMap[riskProfile] || riskMap.moderate
    return MOCK_RECOMMENDATIONS.filter(r => allowed.includes(r.riskLevel))
  },

  async analyzeStock(symbol, newsContext = []) {
    const settings = storageService.getSettings()
    const anthropicKey = settings.anthropicKey

    if (!anthropicKey) {
      return getMockAnalysis(symbol)
    }

    try {
      const newsText = newsContext
        .slice(0, 5)
        .map(n => `- ${n.title}: ${n.summary}`)
        .join('\n')

      const prompt = `Du bist ein erfahrener Börsenanalyst mit Schwerpunkt auf deutschen und europäischen Aktien (XETRA/Frankfurt). Analysiere die Aktie ${symbol} (XETRA) anhand folgender aktueller Nachrichten:

${newsText || 'Keine spezifischen Nachrichten verfügbar.'}

Erstelle eine strukturierte Analyse auf Deutsch mit:
1. Handlungsempfehlung: "buy" | "sell" | "watch"
2. Konfidenz: 0–100
3. Kursziel in EUR (12 Monate)
4. Zeithorizont: "1-3 Monate" | "3-6 Monate" | "6-12 Monate"
5. Risiko: "low" | "medium" | "high"
6. Begründung (3 Sätze, Deutsch)
7. Katalysatoren: 3 Punkte
8. Risiken: 3 Punkte

Berücksichtige dabei: DAX-Umfeld, EZB-Zinspolitik, Konjunktur Deutschland/Europa, Branchentrends.
Antworte NUR als gültiges JSON-Objekt.`

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

      if (!response.ok) throw new Error(`API Error ${response.status}`)
      const data = await response.json()
      const text = data.content[0].text

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) return JSON.parse(jsonMatch[0])
      } catch {}
      return { reasoning: text, action: 'watch', confidence: 60 }
    } catch (e) {
      console.warn('Claude API Fehler:', e.message)
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

      const prompt = `Erstelle einen prägnanten Börsenmorgen-Report für DAX-Investoren.

Datum: ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Heutige KI-Empfehlungen (XETRA):
${recoText}

Wichtigste Nachrichten:
${newsText}

Format:
1. Kurzer Marktausblick für den DAX (2 Sätze)
2. Top-Empfehlung mit Begründung (2 Sätze)
3. Wichtigstes Risiko heute (1 Satz)

Stil: Professionell, präzise, auf den Punkt. Max. 150 Wörter.`

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

// ─── Mock-Analysen für Demo-Modus ─────────────────────────────────────────────
function getMockAnalysis(symbol) {
  const analyses = {
    SAP:   { action: 'buy',   confidence: 88, reasoning: 'SAP transformiert sich erfolgreich in eine Cloud-Plattform. KI-Integration in S/4HANA bietet nachhaltiges Wachstumspotenzial. Bewertung trotz Anstieg noch attraktiv vs. globalen Software-Peers.', catalysts: ['Cloud-ARR Wachstum', 'Business AI', 'RISE with SAP'], risks: ['IT-Budgetkürzungen', 'Migrations-Verzögerungen'] },
    IFX:   { action: 'buy',   confidence: 79, reasoning: 'Infineon positioniert sich ideal im Halbleiterzyklus-Aufschwung 2025. SiC-Technologie für E-Fahrzeuge und KI-Infrastruktur sind Wachstumstreiber. Bewertung nach Korrektur attraktiv.', catalysts: ['E-Mobilität Erholung', 'KI-Server', 'SiC-Kapazitäten'], risks: ['Zyklusrisiko', 'China-Exposure'] },
    BAYN:  { action: 'sell',  confidence: 72, reasoning: 'Bayer bleibt durch Glyphosat-Verbindlichkeiten strukturell belastet. Pharmapipeline bietet keine kurzfristige Entlastung. Bewertungsrisiko überwiegt Katalysator-Potenzial.', catalysts: ['Glyphosat-Vergleich', 'Pharma-Pipeline'], risks: ['Rechtsverbindlichkeiten', 'Verschuldung', 'Pipeline-Rückschläge'] },
    ALV:   { action: 'buy',   confidence: 82, reasoning: 'Allianz überzeugt mit Rekordgewinnen und attraktiver Dividendenrendite. Zinsnormalisierung verbessert Kapitalanlage-Ergebnisse strukturell. Defensiver DAX-Anker.', catalysts: ['Dividendenerhöhung', 'Aktienrückkauf', 'Zinsnormalisierung'], risks: ['Großkatastrophen', 'Regulierung'] },
    VOW3:  { action: 'watch', confidence: 55, reasoning: 'VW handelt auf historisch günstiger Bewertung, aber strukturelle Herausforderungen in der E-Mobilität begrenzen kurzfristiges Aufwärtspotenzial. Restrukturierungserfolg entscheidend.', catalysts: ['Sparprogramm', 'China-Erholung', 'Software-Integration'], risks: ['BYD-Wettbewerb', 'Nachfrageschwäche E-Autos', 'Gewerkschaft'] },
  }
  return analyses[symbol] || {
    action: 'watch',
    confidence: 62,
    reasoning: 'Marktlage erfordert sorgfältige Beobachtung. DAX-Umfeld bleibt von EZB-Politik und globaler Konjunktur abhängig. Diversifikation empfohlen.',
    catalysts: ['EZB-Zinssenkungen', 'Konjunkturerholung', 'Sektor-Rotation'],
    risks: ['Rezessionsrisiko Deutschland', 'Geopolitik', 'Energiepreise'],
  }
}

function getMockMorningReport(recommendations, _topNews) {
  const buyRecs = recommendations.filter(r => r.action === 'buy')
  const topRec = buyRecs[0]
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return `📊 **Velocity DAX-Report** – ${today}

**Marktausblick:** Der DAX dürfte moderat fester eröffnen. EZB-Zinssenkungserwartungen stützen das Sentiment, während schwache Industrie-PMI-Daten die Aufwärtsbewegung begrenzen.

**Top-Empfehlung:** ${topRec ? `**${topRec.symbol}** (${topRec.action.toUpperCase()}) – ${topRec.reasoning.split('.')[0]}.` : 'Defensive Sektoren bevorzugen.'} Konfidenz: ${topRec?.confidence || 70}%.

**Hauptrisiko heute:** Bundesbank-Kommentare zur Konjunkturlage und US-Handelsbilanzdaten (14:30 Uhr) könnten für Volatilität sorgen.

*Diese Analyse basiert auf KI-generierten Signalen. Keine Anlageberatung – bitte eigene Due Diligence durchführen.*`
}
