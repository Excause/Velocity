import { subDays, format, subHours, subMinutes } from 'date-fns'

// ─── Generate realistic price history ───────────────────────────────────────
function generatePriceHistory(startPrice, days = 365, volatility = 0.015) {
  const history = []
  let price = startPrice
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const date = subDays(now, i)
    const change = price * volatility * (Math.random() - 0.48)
    price = Math.max(price + change, 1)
    history.push({
      date: format(date, 'yyyy-MM-dd'),
      open: parseFloat((price * (1 - Math.random() * 0.005)).toFixed(2)),
      high: parseFloat((price * (1 + Math.random() * 0.01)).toFixed(2)),
      low: parseFloat((price * (1 - Math.random() * 0.01)).toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 50000000 + 5000000),
    })
  }
  return history
}

// ─── Stocks ──────────────────────────────────────────────────────────────────
export const MOCK_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 227.52, change: 2.14, changePct: 0.95, marketCap: 3420000000000, pe: 32.1, history: generatePriceHistory(180, 365, 0.014) },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', price: 415.30, change: -1.87, changePct: -0.45, marketCap: 3080000000000, pe: 35.6, history: generatePriceHistory(340, 365, 0.013) },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', price: 875.40, change: 24.30, changePct: 2.85, marketCap: 2150000000000, pe: 68.4, history: generatePriceHistory(480, 365, 0.028) },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', price: 178.20, change: 0.85, changePct: 0.48, marketCap: 2190000000000, pe: 22.8, history: generatePriceHistory(130, 365, 0.016) },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', price: 195.80, change: 3.22, changePct: 1.67, marketCap: 2040000000000, pe: 48.2, history: generatePriceHistory(140, 365, 0.018) },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', price: 564.10, change: -8.40, changePct: -1.47, marketCap: 1430000000000, pe: 26.3, history: generatePriceHistory(380, 365, 0.022) },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', price: 248.50, change: 12.80, changePct: 5.43, marketCap: 792000000000, pe: 61.7, history: generatePriceHistory(180, 365, 0.038) },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials', price: 468.20, change: 0.95, changePct: 0.20, marketCap: 1010000000000, pe: 14.2, history: generatePriceHistory(390, 365, 0.009) },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', price: 218.30, change: -2.15, changePct: -0.97, marketCap: 632000000000, pe: 11.4, history: generatePriceHistory(165, 365, 0.014) },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', price: 158.40, change: 0.62, changePct: 0.39, marketCap: 381000000000, pe: 15.8, history: generatePriceHistory(145, 365, 0.010) },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', price: 284.70, change: 1.45, changePct: 0.51, marketCap: 589000000000, pe: 29.4, history: generatePriceHistory(235, 365, 0.012) },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', price: 87.30, change: -0.42, changePct: -0.48, marketCap: 701000000000, pe: 40.2, history: generatePriceHistory(72, 365, 0.011) },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', price: 116.80, change: 2.10, changePct: 1.83, marketCap: 466000000000, pe: 13.6, history: generatePriceHistory(98, 365, 0.018) },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', price: 546.20, change: -4.80, changePct: -0.87, marketCap: 503000000000, pe: 20.3, history: generatePriceHistory(490, 365, 0.013) },
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', price: 872.40, change: 18.60, changePct: 2.18, marketCap: 825000000000, pe: 118.4, history: generatePriceHistory(580, 365, 0.025) },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', price: 168.40, change: 3.20, changePct: 1.94, marketCap: 780000000000, pe: 44.8, history: generatePriceHistory(120, 365, 0.020) },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financials', price: 494.30, change: 2.80, changePct: 0.57, marketCap: 461000000000, pe: 37.2, history: generatePriceHistory(410, 365, 0.012) },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', price: 168.20, change: -0.35, changePct: -0.21, marketCap: 395000000000, pe: 26.8, history: generatePriceHistory(152, 365, 0.009) },
  { symbol: 'HD', name: 'Home Depot', sector: 'Consumer Cyclical', price: 384.50, change: 4.20, changePct: 1.10, marketCap: 381000000000, pe: 23.1, history: generatePriceHistory(310, 365, 0.015) },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', price: 918.30, change: 7.40, changePct: 0.81, marketCap: 405000000000, pe: 55.6, history: generatePriceHistory(740, 365, 0.013) },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', price: 158.70, change: 5.60, changePct: 3.66, marketCap: 256000000000, pe: 52.3, history: generatePriceHistory(110, 365, 0.030) },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication', price: 698.40, change: -11.20, changePct: -1.58, marketCap: 301000000000, pe: 42.1, history: generatePriceHistory(520, 365, 0.025) },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', price: 282.10, change: 3.40, changePct: 1.22, marketCap: 273000000000, pe: 48.6, history: generatePriceHistory(220, 365, 0.020) },
  { symbol: 'ORCL', name: 'Oracle Corp.', sector: 'Technology', price: 148.60, change: 1.80, changePct: 1.23, marketCap: 402000000000, pe: 32.4, history: generatePriceHistory(112, 365, 0.015) },
  { symbol: 'SAP', name: 'SAP SE', sector: 'Technology', price: 228.40, change: 0.90, changePct: 0.40, marketCap: 274000000000, pe: 38.2, history: generatePriceHistory(186, 365, 0.013) },
]

// ─── News Articles ────────────────────────────────────────────────────────────
export const MOCK_NEWS = [
  {
    id: 1,
    title: 'NVIDIA schlägt Erwartungen: KI-Chip-Nachfrage bleibt ungebrochen stark',
    source: 'Reuters',
    publishedAt: subHours(new Date(), 1).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.87,
    impact: 'high',
    relatedSymbols: ['NVDA', 'AMD', 'AAPL'],
    summary: 'NVIDIAs Q4-Ergebnisse übertreffen Analystenprognosen erheblich. CEO Jensen Huang kündigt neue Blackwell-Ultra-Chips an. Rechenzentrumseinnahmen stiegen um 422% im Jahresvergleich.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 2,
    title: 'Federal Reserve hält Zinsen stabil – Signale für mögliche Senkung im Juni',
    source: 'Bloomberg',
    publishedAt: subHours(new Date(), 3).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.62,
    impact: 'high',
    relatedSymbols: ['JPM', 'V', 'MA', 'BRK.B'],
    summary: 'Die US-Notenbank beließ die Zinsen bei 5,25-5,50%. Fed-Chef Powell deutete mögliche Zinssenkungen im zweiten Halbjahr 2025 an, abhängig von Inflationsdaten.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 3,
    title: 'Apple Vision Pro: Enttäuschende Verkaufszahlen belasten Aktie',
    source: 'Financial Times',
    publishedAt: subHours(new Date(), 5).toISOString(),
    sentiment: 'negative',
    sentimentScore: -0.54,
    impact: 'medium',
    relatedSymbols: ['AAPL'],
    summary: 'Apple meldet schwächere als erwartete Vision Pro Verkäufe. Analysten senken Kursziele. Gleichzeitig starkes iPhone 16 Wachstum in Schwellenländern.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 4,
    title: 'Warren Buffett erhöht Berkshire-Position in japanischen Handelshäusern',
    source: 'WSJ',
    publishedAt: subHours(new Date(), 7).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.71,
    impact: 'medium',
    relatedSymbols: ['BRK.B'],
    summary: 'Berkshire Hathaway hat seine Beteiligungen an japanischen Handelshäusern auf über 9% erhöht. Buffett sieht attraktive Bewertungen und starke Dividenden.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 5,
    title: 'Meta\'s Llama 4 übertrumpft GPT-4 in Benchmarks – Aktie steigt vorbörslich',
    source: 'TechCrunch',
    publishedAt: subHours(new Date(), 9).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.79,
    impact: 'medium',
    relatedSymbols: ['META', 'MSFT', 'GOOGL'],
    summary: 'Meta veröffentlicht Llama 4 Open-Source-Modell mit überlegener Performance. Aktie steigt 3,2% im vorbörslichen Handel. KI-Wettbewerb verschärft sich.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 6,
    title: 'Tesla Cybertruck Rückruf: Sicherheitsprobleme bei 11.000 Fahrzeugen',
    source: 'Reuters',
    publishedAt: subHours(new Date(), 11).toISOString(),
    sentiment: 'negative',
    sentimentScore: -0.68,
    impact: 'medium',
    relatedSymbols: ['TSLA'],
    summary: 'Tesla ruft 11.000 Cybertruck-Fahrzeuge wegen Problemen mit dem Accelerator Pad zurück. NHTSA untersucht Vorfall. Aktie verliert 2,1% im frühen Handel.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 7,
    title: 'Microsoft Azure wächst um 31% – Cloud-Dominanz festigt sich',
    source: 'CNBC',
    publishedAt: subHours(new Date(), 14).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.83,
    impact: 'high',
    relatedSymbols: ['MSFT', 'GOOGL', 'AMZN'],
    summary: 'Microsoft übertrifft Prognosen mit starkem Azure-Wachstum. KI-Dienste tragen 7 Prozentpunkte zum Azure-Wachstum bei. Copilot erreicht 400 Millionen Nutzer.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 8,
    title: 'Eli Lilly Gewichtsverlust-Pille zeigt 20% Wirksamkeit in neuer Studie',
    source: 'New England Journal of Medicine',
    publishedAt: subHours(new Date(), 18).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.91,
    impact: 'high',
    relatedSymbols: ['LLY'],
    summary: 'Klinische Studie zeigt überragende Ergebnisse für Eli Lillys orales GLP-1-Medikament Orforglipron. Aktie erreicht neues 52-Wochen-Hoch.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 9,
    title: 'OPEC+ kürzt Ölförderung – Energieaktien profitieren',
    source: 'Bloomberg',
    publishedAt: subHours(new Date(), 22).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.58,
    impact: 'medium',
    relatedSymbols: ['XOM'],
    summary: 'OPEC+ einigt sich auf weitere Produktionskürzungen von 500.000 Barrel pro Tag. Ölpreis steigt auf 89 USD/Barrel. Energieaktien legen breit zu.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 10,
    title: 'Amazon Projekt Kuiper: Erste Satelliten erfolgreich im Orbit',
    source: 'Space.com',
    publishedAt: subDays(new Date(), 1).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.66,
    impact: 'low',
    relatedSymbols: ['AMZN'],
    summary: 'Amazon hat erfolgreich 27 Kuiper-Internetsatelliten ins All gebracht. Direkter Konkurrent zu SpaceXs Starlink. Kommerzieller Start für 2025 geplant.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 11,
    title: 'Google kündigt Gemini 2.0 Ultra an – DeepMind-Durchbruch bei Reasoning',
    source: 'The Verge',
    publishedAt: subDays(new Date(), 1).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.74,
    impact: 'medium',
    relatedSymbols: ['GOOGL', 'META', 'MSFT'],
    summary: 'Google präsentiert neues KI-Flaggschiff mit überlegenen Reasoning-Fähigkeiten. Nahtlose Integration in Google Workspace angekündigt.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 12,
    title: 'Costco Mitgliederzahlen übertreffen 130 Millionen – Rekordhoch',
    source: 'MarketWatch',
    publishedAt: subDays(new Date(), 1).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.69,
    impact: 'medium',
    relatedSymbols: ['COST'],
    summary: 'Costco verzeichnet Rekordmitgliederzahl und erhöht Jahresgebühr erstmals seit 2017. Analysten erhöhen Kursziele mehrheitlich.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 13,
    title: 'Netflix verliert Abonnenten in Deutschland durch Passwort-Sharing-Regelung',
    source: 'Handelsblatt',
    publishedAt: subDays(new Date(), 2).toISOString(),
    sentiment: 'negative',
    sentimentScore: -0.42,
    impact: 'low',
    relatedSymbols: ['NFLX'],
    summary: 'Trotz globaler Abonnentenzunahme zeigt Deutschland Rückgänge. Europäischer Markt bleibt unter Druck. Werbemodell wächst stark als Ausgleich.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 14,
    title: 'AMD EPYC Turin Prozessoren: Microsoft wählt AMD für neue Rechenzentren',
    source: 'AnandTech',
    publishedAt: subDays(new Date(), 2).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.77,
    impact: 'medium',
    relatedSymbols: ['AMD', 'MSFT', 'NVDA'],
    summary: 'Microsoft wählt AMDs neueste EPYC Turin Server-Prozessoren für Azure-Rechenzentren. Großer Vertrag stärkt AMDs Position im Servermarkt.',
    url: '#',
    imageUrl: null,
  },
  {
    id: 15,
    title: 'Visa meldet starkes Transaktionsvolumen trotz Konjunktursorgen',
    source: 'Reuters',
    publishedAt: subDays(new Date(), 2).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.61,
    impact: 'medium',
    relatedSymbols: ['V', 'MA'],
    summary: 'Visa übertrifft Q3-Schätzungen mit 9% Umsatzwachstum. Internationales Reisevolumen weiterhin stark. Dividend um 7% erhöht.',
    url: '#',
    imageUrl: null,
  },
]

// ─── AI Recommendations ───────────────────────────────────────────────────────
export const MOCK_RECOMMENDATIONS = [
  {
    id: 1,
    symbol: 'NVDA',
    action: 'buy',
    confidence: 92,
    priceTarget: 980,
    currentPrice: 875.40,
    upside: 11.9,
    timeHorizon: '3-6 Monate',
    riskLevel: 'medium',
    reasoning: 'Starke Nachfrage nach Blackwell-GPUs übertrifft alle Schätzungen. Rechenzentrumseinnahmen wachsen exponentiell. Microsoft, Google und Amazon erhöhen CapEx. KI-Infrastrukturausgaben bleiben trotz Makrounsicherheiten robust. Bewertung weiterhin gerechtfertigt durch Wachstumsdynamik.',
    catalysts: ['Blackwell Ultra Chip-Launch Q2 2025', 'Nvidia DGX Cloud Expansion', 'Automotive AI-Segment wächst 150% YoY'],
    risks: ['Exportbeschränkungen China', 'Bewertungsrisiko bei KI-Abkühlung'],
    newsImpact: 'Stark positiv – multiple positive Earnings-Überraschungen',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    symbol: 'LLY',
    action: 'buy',
    confidence: 88,
    priceTarget: 1050,
    currentPrice: 872.40,
    upside: 20.4,
    timeHorizon: '6-12 Monate',
    riskLevel: 'medium',
    reasoning: 'GLP-1 Markt explodiert. Mounjaro und Zepbound dominieren Gewichtsverlust-Sektor. Pipeline mit oralen GLP-1-Kandidaten reduziert Langfristrisiken. Produktionsengpässe werden 2025 behoben. 60% Umsatzwachstum YoY erwartet.',
    catalysts: ['Orforglipron FDA-Zulassung erwartet', 'Donanemab Alzheimer-Zulassung', 'International Expansion GLP-1'],
    risks: ['Produktionskapazität', 'Preisverhandlungen Medicare'],
    newsImpact: 'Sehr positiv – Studienergebnisse übertreffen Erwartungen',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    symbol: 'MSFT',
    action: 'buy',
    confidence: 85,
    priceTarget: 470,
    currentPrice: 415.30,
    upside: 13.2,
    timeHorizon: '6-12 Monate',
    riskLevel: 'low',
    reasoning: 'Azure-Wachstum übertrifft Erwartungen. Copilot-Monetarisierung beginnt Früchte zu tragen. 400M aktive Copilot-Nutzer. OpenAI-Investment erzeugt erhebliche Netzwerkeffekte. Teams Premium-Segment wächst überproportional.',
    catalysts: ['Copilot+ PC Supercycle', 'Azure AI Services Expansion', 'Enterprise AI-Verträge Q2'],
    risks: ['Regulatorische Risiken EU', 'OpenAI Abhängigkeit'],
    newsImpact: 'Positiv – konsistent starke Quartalszahlen',
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    symbol: 'META',
    action: 'watch',
    confidence: 65,
    priceTarget: 590,
    currentPrice: 564.10,
    upside: 4.6,
    timeHorizon: '3-6 Monate',
    riskLevel: 'medium',
    reasoning: 'Starke Werbeeinnahmen aber Bewertung bereits ambitioniert. Llama 4 ist strategisch positiv aber kurzfristig kostenintensiv. Reality Labs weiterhin stark defizitär. Zuckerbergs KI-Investitionspläne erhöhen kurzfristigen Kostendruck.',
    catalysts: ['Llama 4 Monetarisierung', 'WhatsApp Business Premium', 'AR Glasses 2025'],
    risks: ['CapEx Eskalation', 'Regulatorische Probleme Europa', 'Jugendschutz-Regulierung'],
    newsImpact: 'Gemischt – Llama positiv, CapEx besorgniserregend',
    createdAt: new Date().toISOString(),
  },
  {
    id: 5,
    symbol: 'TSLA',
    action: 'watch',
    confidence: 55,
    priceTarget: 280,
    currentPrice: 248.50,
    upside: 12.7,
    timeHorizon: '6-12 Monate',
    riskLevel: 'high',
    reasoning: 'Preissenkungen belasten Margen. Cybertruck-Rückruf ist negatives Signal für Qualitätskontrolle. Autonomes Fahren (FSD) bleibt Hauptkatalysator aber Zeitplan unklar. Musk-Ablenkung durch Twitter/X. Energy Storage wächst stark als Gegengewicht.',
    catalysts: ['FSD v13 Launch', 'Robotaxi-Service Rollout', 'Energiespeicher Profitabilität'],
    risks: ['Margenrückgang', 'Wettbewerb aus China (BYD)', 'CEO-Ablenkung', 'Rückrufhäufung'],
    newsImpact: 'Negativ – Rückruf und Marktanteilsverluste',
    createdAt: new Date().toISOString(),
  },
  {
    id: 6,
    symbol: 'NFLX',
    action: 'sell',
    confidence: 72,
    priceTarget: 580,
    currentPrice: 698.40,
    upside: -16.9,
    timeHorizon: '3-6 Monate',
    riskLevel: 'medium',
    reasoning: 'Bewertung mit 42x KGV historisch hoch. Wachstum im europäischen Markt verlangsamt sich. Passwort-Sharing-Maßnahmen zeigen Nebenwirkungen. Disney+ und Apple TV+ intensivieren Wettbewerb. Kurzfristige Kursziele erscheinen überholt.',
    catalysts: ['Ad-Tier Monetarisierung', 'Live-Sport-Rechte (F1 2025)', 'Games-Expansion'],
    risks: ['Marktanteilsverlust', 'Content-Kosten steigen', 'Bewertungskorrektur'],
    newsImpact: 'Negativ – europäische Abonnentenzahlen enttäuschend',
    createdAt: new Date().toISOString(),
  },
  {
    id: 7,
    symbol: 'AMD',
    action: 'buy',
    confidence: 81,
    priceTarget: 200,
    currentPrice: 158.70,
    upside: 26.0,
    timeHorizon: '6-12 Monate',
    riskLevel: 'medium',
    reasoning: 'MI300X GPU-Nachfrage übertrifft Erwartungen. Microsoft-EPYC-Deal stärkt Servermarkt. Bewertung deutlich attraktiver als NVIDIA. MI350 Launch Q3 2025 erwartet. Datacenter AI-Revenue 2025 auf $5B+ gesteigert.',
    catalysts: ['MI350 GPU Launch', 'EPYC Turin Servermarkt-Gewinne', 'PC-Markt-Erholung'],
    risks: ['NVIDIA-Dominanz', 'Supply Chain Risiken'],
    newsImpact: 'Positiv – Microsoft-Deal, starke GPU-Nachfrage',
    createdAt: new Date().toISOString(),
  },
  {
    id: 8,
    symbol: 'JPM',
    action: 'buy',
    confidence: 78,
    priceTarget: 245,
    currentPrice: 218.30,
    upside: 12.2,
    timeHorizon: '6-12 Monate',
    riskLevel: 'low',
    reasoning: 'Starkes Kreditbuch, diversifiziertes Geschäftsmodell. Investmentbanking erholt sich. Zinssenkungserwartungen positiv für Spread-Geschäft. Dividendenrendite von 2,3% attraktiv. Solides Kapitalpolster für Konjunkturunsicherheiten.',
    catalysts: ['Zinssenkungszyklus startet', 'IB-Pipeline stark', 'Aktienrückkäufe'],
    risks: ['Kreditausfallrisiken', 'Regulierungsdruck', 'Rezessionsrisiko'],
    newsImpact: 'Neutral – Fed-Pause kurzzeitig negativ, Normalisierung erwartet',
    createdAt: new Date().toISOString(),
  },
]

// ─── Portfolio / Simulator Data ───────────────────────────────────────────────
export const INITIAL_PORTFOLIO = {
  cash: 10000,
  startingCapital: 10000,
  positions: [],
  transactions: [],
  createdAt: new Date().toISOString(),
}

// ─── Market Indices ───────────────────────────────────────────────────────────
export const MOCK_INDICES = [
  { name: 'S&P 500', value: 5218.40, change: 23.45, changePct: 0.45 },
  { name: 'NASDAQ', value: 16421.80, change: -42.30, changePct: -0.26 },
  { name: 'DOW JONES', value: 39872.10, change: 105.20, changePct: 0.26 },
  { name: 'DAX', value: 18748.30, change: 87.60, changePct: 0.47 },
  { name: 'NIKKEI', value: 39682.50, change: -124.80, changePct: -0.31 },
  { name: 'BTC/USD', value: 68420.50, change: 1240.30, changePct: 1.85 },
]

// ─── Sector Performance ───────────────────────────────────────────────────────
export const MOCK_SECTORS = [
  { name: 'Technology', changePct: 1.42, marketCap: 15800000000000 },
  { name: 'Healthcare', changePct: 0.87, marketCap: 7200000000000 },
  { name: 'Financials', changePct: -0.23, marketCap: 8900000000000 },
  { name: 'Consumer Cyclical', changePct: 0.64, marketCap: 5400000000000 },
  { name: 'Energy', changePct: 1.95, marketCap: 4100000000000 },
  { name: 'Consumer Staples', changePct: -0.18, marketCap: 3800000000000 },
  { name: 'Communication', changePct: -0.52, marketCap: 4600000000000 },
  { name: 'Industrials', changePct: 0.31, marketCap: 5200000000000 },
]

// ─── Backtest: AI Recommendations vs. Market ──────────────────────────────────
export function generateBacktestData(startCapital = 10000, days = 90) {
  const data = []
  let aiPortfolio = startCapital
  let spPortfolio = startCapital
  let userPortfolio = startCapital
  const now = new Date()

  for (let i = days; i >= 0; i--) {
    const date = subDays(now, i)
    // AI-guided: slightly outperforms with more volatility
    const aiChange = (Math.random() - 0.44) * 0.025
    // S&P 500 benchmark
    const spChange = (Math.random() - 0.47) * 0.015
    // User random decisions
    const userChange = (Math.random() - 0.50) * 0.020

    aiPortfolio *= 1 + aiChange
    spPortfolio *= 1 + spChange
    userPortfolio *= 1 + userChange

    data.push({
      date: format(date, 'MMM dd'),
      fullDate: format(date, 'yyyy-MM-dd'),
      aiPortfolio: parseFloat(aiPortfolio.toFixed(2)),
      spPortfolio: parseFloat(spPortfolio.toFixed(2)),
      userPortfolio: parseFloat(userPortfolio.toFixed(2)),
    })
  }
  return data
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getStockBySymbol(symbol) {
  return MOCK_STOCKS.find(s => s.symbol === symbol)
}

export function getStockHistory(symbol, days = 30) {
  const stock = getStockBySymbol(symbol)
  if (!stock) return []
  return stock.history.slice(-days)
}
