import { subDays, format, subHours } from 'date-fns'

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
      volume: Math.floor(Math.random() * 8000000 + 500000),
    })
  }
  return history
}

// ─── Deutsche Aktien (DAX 40 + ausgewählte MDAX) ────────────────────────────
// Yahoo Finance Suffix: .DE  |  Finnhub: Symbol:XETRA
export const MOCK_STOCKS = [
  // ── DAX 40 ──────────────────────────────────────────────────────────────
  { symbol: 'SAP',   yahooSymbol: 'SAP.DE',   name: 'SAP SE',                     sector: 'Technologie',       price: 228.40, change: 3.20,  changePct:  1.42, marketCap: 274000000000, pe: 38.2, history: generatePriceHistory(186, 365, 0.014) },
  { symbol: 'SIE',   yahooSymbol: 'SIE.DE',   name: 'Siemens AG',                 sector: 'Industrie',         price: 186.30, change: 1.85,  changePct:  1.00, marketCap: 148000000000, pe: 17.4, history: generatePriceHistory(152, 365, 0.013) },
  { symbol: 'ALV',   yahooSymbol: 'ALV.DE',   name: 'Allianz SE',                 sector: 'Versicherung',      price: 298.60, change: -1.40, changePct: -0.47, marketCap: 116000000000, pe: 11.2, history: generatePriceHistory(255, 365, 0.011) },
  { symbol: 'DTE',   yahooSymbol: 'DTE.DE',   name: 'Deutsche Telekom AG',        sector: 'Telekommunikation', price: 24.18,  change: 0.22,  changePct:  0.92, marketCap: 115000000000, pe: 14.8, history: generatePriceHistory(19, 365, 0.012) },
  { symbol: 'MUV2',  yahooSymbol: 'MUV2.DE',  name: 'Münchener Rückversicherung', sector: 'Versicherung',      price: 442.50, change: 5.30,  changePct:  1.21, marketCap: 56000000000,  pe: 12.6, history: generatePriceHistory(380, 365, 0.011) },
  { symbol: 'IFX',   yahooSymbol: 'IFX.DE',   name: 'Infineon Technologies AG',   sector: 'Technologie',       price: 32.84,  change: -0.96, changePct: -2.84, marketCap: 43000000000,  pe: 24.1, history: generatePriceHistory(28, 365, 0.025) },
  { symbol: 'BMW',   yahooSymbol: 'BMW.DE',   name: 'BMW AG',                     sector: 'Automobil',         price: 87.52,  change: 1.14,  changePct:  1.32, marketCap: 52000000000,  pe: 4.8,  history: generatePriceHistory(74, 365, 0.017) },
  { symbol: 'MBG',   yahooSymbol: 'MBG.DE',   name: 'Mercedes-Benz Group AG',     sector: 'Automobil',         price: 62.40,  change: -0.84, changePct: -1.33, marketCap: 64000000000,  pe: 5.2,  history: generatePriceHistory(54, 365, 0.016) },
  { symbol: 'BAS',   yahooSymbol: 'BAS.DE',   name: 'BASF SE',                    sector: 'Chemie',            price: 46.82,  change: 0.44,  changePct:  0.95, marketCap: 41000000000,  pe: 22.4, history: generatePriceHistory(42, 365, 0.016) },
  { symbol: 'BAYN',  yahooSymbol: 'BAYN.DE',  name: 'Bayer AG',                   sector: 'Gesundheit',        price: 27.14,  change: -0.58, changePct: -2.09, marketCap: 26000000000,  pe: null, history: generatePriceHistory(26, 365, 0.022) },
  { symbol: 'VOW3',  yahooSymbol: 'VOW3.DE',  name: 'Volkswagen AG (Vz.)',        sector: 'Automobil',         price: 103.80, change: 2.10,  changePct:  2.06, marketCap: 49000000000,  pe: 3.6,  history: generatePriceHistory(88, 365, 0.018) },
  { symbol: 'AIR',   yahooSymbol: 'AIR.DE',   name: 'Airbus SE',                  sector: 'Luftfahrt',         price: 176.42, change: 2.84,  changePct:  1.64, marketCap: 138000000000, pe: 30.8, history: generatePriceHistory(142, 365, 0.016) },
  { symbol: 'LIN',   yahooSymbol: 'LIN.DE',   name: 'Linde plc',                  sector: 'Chemie',            price: 452.30, change: 3.80,  changePct:  0.85, marketCap: 212000000000, pe: 29.6, history: generatePriceHistory(398, 365, 0.012) },
  { symbol: 'ADS',   yahooSymbol: 'ADS.DE',   name: 'adidas AG',                  sector: 'Konsumgüter',       price: 231.50, change: -4.20, changePct: -1.78, marketCap: 38000000000,  pe: 44.2, history: generatePriceHistory(195, 365, 0.022) },
  { symbol: 'RWE',   yahooSymbol: 'RWE.DE',   name: 'RWE AG',                     sector: 'Energie',           price: 32.44,  change: 0.54,  changePct:  1.69, marketCap: 25000000000,  pe: 8.4,  history: generatePriceHistory(29, 365, 0.017) },
  { symbol: 'EOAN',  yahooSymbol: 'EOAN.DE',  name: 'E.ON SE',                    sector: 'Energie',           price: 12.08,  change: 0.12,  changePct:  1.00, marketCap: 32000000000,  pe: 13.6, history: generatePriceHistory(10, 365, 0.013) },
  { symbol: 'DHL',   yahooSymbol: 'DHL.DE',   name: 'DHL Group',                  sector: 'Logistik',          price: 37.60,  change: -0.40, changePct: -1.05, marketCap: 46000000000,  pe: 12.4, history: generatePriceHistory(33, 365, 0.014) },
  { symbol: 'HNR1',  yahooSymbol: 'HNR1.DE',  name: 'Hannover Rück SE',           sector: 'Versicherung',      price: 252.80, change: 1.60,  changePct:  0.64, marketCap: 30000000000,  pe: 13.8, history: generatePriceHistory(216, 365, 0.011) },
  { symbol: 'MRK',   yahooSymbol: 'MRK.DE',   name: 'Merck KGaA',                 sector: 'Gesundheit',        price: 174.25, change: 2.15,  changePct:  1.25, marketCap: 75000000000,  pe: 21.4, history: generatePriceHistory(148, 365, 0.016) },
  { symbol: 'BEI',   yahooSymbol: 'BEI.DE',   name: 'Beiersdorf AG',              sector: 'Konsumgüter',       price: 143.85, change: 0.85,  changePct:  0.59, marketCap: 35000000000,  pe: 28.6, history: generatePriceHistory(126, 365, 0.012) },
  { symbol: 'HENKA', yahooSymbol: 'HENKA.DE', name: 'Henkel AG & Co. KGaA',       sector: 'Konsumgüter',       price: 86.40,  change: -0.52, changePct: -0.60, marketCap: 35000000000,  pe: 16.8, history: generatePriceHistory(78, 365, 0.012) },
  { symbol: 'VNA',   yahooSymbol: 'VNA.DE',   name: 'Vonovia SE',                 sector: 'Immobilien',        price: 29.86,  change: 0.48,  changePct:  1.63, marketCap: 22000000000,  pe: null, history: generatePriceHistory(25, 365, 0.018) },
  { symbol: 'CON',   yahooSymbol: 'CON.DE',   name: 'Continental AG',             sector: 'Automobil',         price: 63.28,  change: 1.22,  changePct:  1.97, marketCap: 12000000000,  pe: 8.2,  history: generatePriceHistory(56, 365, 0.018) },
  { symbol: 'FRE',   yahooSymbol: 'FRE.DE',   name: 'Fresenius SE & Co. KGaA',    sector: 'Gesundheit',        price: 35.40,  change: 0.64,  changePct:  1.84, marketCap: 19000000000,  pe: 16.2, history: generatePriceHistory(30, 365, 0.015) },
  { symbol: 'MTX',   yahooSymbol: 'MTX.DE',   name: 'MTU Aero Engines AG',        sector: 'Luftfahrt',         price: 278.50, change: 4.20,  changePct:  1.53, marketCap: 14000000000,  pe: 22.8, history: generatePriceHistory(236, 365, 0.016) },
  // ── MDAX / TecDAX Auswahl ────────────────────────────────────────────────
  { symbol: 'DBK',   yahooSymbol: 'DBK.DE',   name: 'Deutsche Bank AG',           sector: 'Finanzen',          price: 17.84,  change: -0.26, changePct: -1.44, marketCap: 36000000000,  pe: 6.8,  history: generatePriceHistory(15, 365, 0.021) },
  { symbol: 'CBK',   yahooSymbol: 'CBK.DE',   name: 'Commerzbank AG',             sector: 'Finanzen',          price: 16.52,  change: 0.34,  changePct:  2.10, marketCap: 21000000000,  pe: 7.4,  history: generatePriceHistory(13, 365, 0.022) },
  { symbol: 'P911',  yahooSymbol: 'P911.DE',  name: 'Porsche AG',                 sector: 'Automobil',         price: 74.20,  change: 1.06,  changePct:  1.45, marketCap: 74000000000,  pe: 8.6,  history: generatePriceHistory(64, 365, 0.019) },
  { symbol: 'DTG',   yahooSymbol: 'DTG.DE',   name: 'Daimler Truck Holding AG',   sector: 'Automobil',         price: 42.80,  change: 0.80,  changePct:  1.90, marketCap: 30000000000,  pe: 8.2,  history: generatePriceHistory(38, 365, 0.016) },
  { symbol: 'HDMG',  yahooSymbol: 'HDMG.DE',  name: 'Heidelberg Materials AG',    sector: 'Baumaterialien',    price: 101.40, change: 1.40,  changePct:  1.40, marketCap: 20000000000,  pe: 10.6, history: generatePriceHistory(88, 365, 0.015) },
]

// ─── Deutsche Finanznachrichten ───────────────────────────────────────────────
export const MOCK_NEWS = [
  {
    id: 1,
    title: 'SAP übertrifft Erwartungen: Cloud-Wachstum beschleunigt sich auf 28%',
    source: 'Handelsblatt',
    publishedAt: subHours(new Date(), 1).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.86,
    impact: 'high',
    relatedSymbols: ['SAP'],
    summary: 'SAP meldet starke Q1-Zahlen mit Cloud-Umsatz von 4,2 Mrd. Euro (+28%). CEO Christian Klein kündigt beschleunigten Wechsel zu RISE with SAP an. Aktie steigt 4,1% im XETRA-Handel.',
    url: '#',
  },
  {
    id: 2,
    title: 'Bundesbank warnt vor Rezessionsrisiken – DAX gibt nach',
    source: 'Reuters',
    publishedAt: subHours(new Date(), 3).toISOString(),
    sentiment: 'negative',
    sentimentScore: -0.58,
    impact: 'high',
    relatedSymbols: ['DBK', 'ALV', 'SIE'],
    summary: 'Die Bundesbank senkt ihre Wachstumsprognose für 2025 auf 0,4%. Schwache Industrieproduktion und hohe Energiepreise belasten die Konjunktur. DAX verliert 0,8% in der Eröffnung.',
    url: '#',
  },
  {
    id: 3,
    title: 'Infineon profitiert von KI-Server-Nachfrage: Ausblick angehoben',
    source: 'dpa-AFX',
    publishedAt: subHours(new Date(), 5).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.79,
    impact: 'high',
    relatedSymbols: ['IFX'],
    summary: 'Infineon hebt Jahresprognose an – Nachfrage nach Leistungshalbleitern für KI-Rechenzentren und Elektrofahrzeuge übertrifft Erwartungen. Umsatzziel 2025 auf 15,5 Mrd. Euro erhöht.',
    url: '#',
  },
  {
    id: 4,
    title: 'Airbus meldet Rekordrückstand: 8.700 Flugzeuge bestellt',
    source: 'Reuters',
    publishedAt: subHours(new Date(), 7).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.82,
    impact: 'medium',
    relatedSymbols: ['AIR', 'MTX'],
    summary: 'Airbus verzeichnet Auftragsbestand von über 8.700 Flugzeugen – ein neues Rekordhoch. Produktionsrate für A320neo-Familie wird auf 75 Maschinen/Monat erhöht. MTU als Zulieferer profitiert.',
    url: '#',
  },
  {
    id: 5,
    title: 'Volkswagen: Sparprogramm zeigt Wirkung – Marge verbessert sich',
    source: 'Manager Magazin',
    publishedAt: subHours(new Date(), 9).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.64,
    impact: 'medium',
    relatedSymbols: ['VOW3', 'BMW', 'MBG'],
    summary: 'VWs Restrukturierungsprogramm greift schneller als erwartet. Operative Marge steigt auf 4,8%. Elektro-Modelle zeigen verbesserte Nachfrage in China. Konkurrenz durch BYD bleibt Risikofaktor.',
    url: '#',
  },
  {
    id: 6,
    title: 'Bayer verliert erneut Glyphosat-Prozess in den USA',
    source: 'Reuters',
    publishedAt: subHours(new Date(), 11).toISOString(),
    sentiment: 'negative',
    sentimentScore: -0.74,
    impact: 'high',
    relatedSymbols: ['BAYN'],
    summary: 'US-Gericht verurteilt Bayer zu 332 Mio. Dollar Schadensersatz im neuesten Roundup-Verfahren. Gesamtverbindlichkeiten aus Glyphosat-Klagen könnten 20 Mrd. Dollar übersteigen.',
    url: '#',
  },
  {
    id: 7,
    title: 'Allianz steigert Betriebsgewinn auf Rekordhoch von 4,7 Mrd. Euro',
    source: 'Börsen-Zeitung',
    publishedAt: subHours(new Date(), 14).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.81,
    impact: 'medium',
    relatedSymbols: ['ALV', 'MUV2', 'HNR1'],
    summary: 'Allianz erzielt im Q1 2025 einen operativen Gewinn von 4,7 Mrd. Euro – ein neues Rekordhoch. Schaden-/Unfallversicherung und Lebensversicherung wachsen zweistellig. Dividendenerhöhung für 2025 angekündigt.',
    url: '#',
  },
  {
    id: 8,
    title: 'EZB signalisiert weitere Zinssenkungen im Sommer 2025',
    source: 'FAZ',
    publishedAt: subHours(new Date(), 18).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.67,
    impact: 'high',
    relatedSymbols: ['DBK', 'CBK', 'ALV', 'VNA'],
    summary: 'EZB-Präsidentin Lagarde deutet zwei weitere Zinssenkungen für Juni und September 2025 an. Inflationsziel von 2% in Reichweite. Banken- und Immobilienaktien reagieren positiv.',
    url: '#',
  },
  {
    id: 9,
    title: 'BASF: Chemiesparte kämpft weiter mit hohen Energiekosten',
    source: 'dpa-AFX',
    publishedAt: subHours(new Date(), 22).toISOString(),
    sentiment: 'negative',
    sentimentScore: -0.46,
    impact: 'medium',
    relatedSymbols: ['BAS'],
    summary: 'BASF senkt Umsatzprognose wegen anhaltend schwacher Nachfrage aus der Automobil- und Bauindustrie. Standortumstrukturierung in Ludwigshafen schreitet voran.',
    url: '#',
  },
  {
    id: 10,
    title: 'Deutsche Telekom: T-Mobile US wächst stärker als erwartet',
    source: 'Handelsblatt',
    publishedAt: subHours(new Date(), 26).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.72,
    impact: 'medium',
    relatedSymbols: ['DTE'],
    summary: 'T-Mobile US verzeichnet 1,4 Mio. neue Nettoabonnenten im Q1 2025 – übertrifft Analystenschätzungen deutlich. Deutsche Telekom profitiert als Mehrheitsaktionär überproportional.',
    url: '#',
  },
  {
    id: 11,
    title: 'adidas: Yeezy-Lagerbestände fast abverkauft – Marge erholt sich',
    source: 'Manager Magazin',
    publishedAt: subHours(new Date(), 30).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.61,
    impact: 'medium',
    relatedSymbols: ['ADS'],
    summary: 'adidas meldet erfolgreichen Abbau der Yeezy-Lagerbestände. Grossmargenverbesserung auf 51,3%. CEO Gulden bekräftigt mittelfristige EBIT-Marge von 10%.',
    url: '#',
  },
  {
    id: 12,
    title: 'Siemens gewinnt Milliarden-Auftrag für Bahntechnik in Indien',
    source: 'Reuters',
    publishedAt: subHours(new Date(), 34).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.76,
    impact: 'medium',
    relatedSymbols: ['SIE'],
    summary: 'Siemens erhält Auftrag über 3,2 Mrd. Euro für 1.200 Lokomotiven der indischen Staatsbahn. Größter Einzelauftrag in der Unternehmensgeschichte. Lieferung ab 2027.',
    url: '#',
  },
  {
    id: 13,
    title: 'Vonovia: Immobilienmarkt dreht – Wohnungspreise stabilisieren sich',
    source: 'Immobilien Zeitung',
    publishedAt: subHours(new Date(), 40).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.58,
    impact: 'medium',
    relatedSymbols: ['VNA'],
    summary: 'Vonovia sieht erste Anzeichen einer Marktstabilisierung. Mieteinnahmen steigen 3,8%. EZB-Zinssenkungen könnten den Bewertungsrückgang stoppen. Verkäufe aus Portfoliooptimierung laufen planmäßig.',
    url: '#',
  },
  {
    id: 14,
    title: 'Commerzbank: UniCredit erhöht Anteil auf 28% – Übernahme rückt näher',
    source: 'FAZ',
    publishedAt: subHours(new Date(), 48).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.70,
    impact: 'high',
    relatedSymbols: ['CBK', 'DBK'],
    summary: 'UniCredit erhöht seinen Anteil an der Commerzbank auf 28%. Übernahmespekulationen treiben die Aktie auf Mehrjahreshoch. Bundesregierung signalisiert keine grundsätzliche Blockade.',
    url: '#',
  },
  {
    id: 15,
    title: 'Münchener Rück: Naturkatastrophen-Schäden 2025 unter Prognose',
    source: 'Börsen-Zeitung',
    publishedAt: subHours(new Date(), 55).toISOString(),
    sentiment: 'positive',
    sentimentScore: 0.68,
    impact: 'medium',
    relatedSymbols: ['MUV2', 'HNR1', 'ALV'],
    summary: 'Münchener Rück meldet Naturkatastrophen-Gesamtschäden von 38 Mrd. Euro in Q1 2025 – deutlich unter dem langjährigen Durchschnitt. Jahresprognose von 5 Mrd. Euro Gewinn bekräftigt.',
    url: '#',
  },
]

// ─── KI-Empfehlungen (deutsche Aktien) ───────────────────────────────────────
export const MOCK_RECOMMENDATIONS = [
  {
    id: 1,
    symbol: 'SAP',
    action: 'buy',
    confidence: 90,
    priceTarget: 268,
    currentPrice: 228.40,
    upside: 17.3,
    timeHorizon: '6-12 Monate',
    riskLevel: 'low',
    reasoning: 'SAP ist Europas größter Softwarekonzern und profitiert massiv vom KI-Trend. Die Cloud-Transformation beschleunigt sich, RISE with SAP gewinnt Enterprise-Kunden. Bewertung trotz Anstieg noch attraktiv vs. US-Peers.',
    catalysts: ['Cloud-Wachstum >25% YoY', 'KI-Integration in S/4HANA', 'Business AI Suite Launch'],
    risks: ['Makroabschwächung dämpft IT-Budget', 'Kundenmigrationstempo'],
    newsImpact: 'Stark positiv – Q1-Zahlen deutlich über Erwartungen',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    symbol: 'AIR',
    action: 'buy',
    confidence: 87,
    priceTarget: 205,
    currentPrice: 176.42,
    upside: 16.2,
    timeHorizon: '6-12 Monate',
    riskLevel: 'low',
    reasoning: 'Airbus verfügt über den größten zivilen Flugzeugauftragsbestand aller Zeiten (8.700+). Produktionsengpässe lösen sich langsam auf. Wachsende globale Reisenachfrage sichert Auftragslage auf Jahre hinaus.',
    catalysts: ['A320neo Produktionserhöhung auf 75/Monat', 'A350-Freighter Launch', 'Defence-Sparte wächst durch Aufrüstung'],
    risks: ['Lieferkettenprobleme (Triebwerke)', 'Geopolitische Risiken'],
    newsImpact: 'Positiv – Rekordrückstand bestätigt langfristige Nachfrage',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    symbol: 'IFX',
    action: 'buy',
    confidence: 82,
    priceTarget: 40,
    currentPrice: 32.84,
    upside: 21.8,
    timeHorizon: '6-12 Monate',
    riskLevel: 'medium',
    reasoning: 'Infineon ist der führende europäische Halbleiterhersteller mit starker Position in Leistungshalbleitern für E-Mobilität und KI-Infrastruktur. Zykluserholung 2025 erwartet, Lagerabbau bei Kunden fast abgeschlossen.',
    catalysts: ['KI-Rechenzentrum-Nachfrage', 'EV-Markterholung China', 'SiC-Technologie-Führerschaft'],
    risks: ['Halbleiterzyklus-Abschwung', 'China-Exportbeschränkungen'],
    newsImpact: 'Positiv – Jahresprognose angehoben',
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    symbol: 'ALV',
    action: 'buy',
    confidence: 84,
    priceTarget: 340,
    currentPrice: 298.60,
    upside: 13.9,
    timeHorizon: '6-12 Monate',
    riskLevel: 'low',
    reasoning: 'Allianz ist eines der defensivsten Investment-Cases im DAX. Rekordgewinne, starke Dividendenrendite (~5,5%), und Aktienrückkäufe stützen den Kurs. Zinsnormalisierung verbessert Asset-Management-Erträge.',
    catalysts: ['Dividendenerhöhung 2025', 'Aktienrückkaufprogramm 2 Mrd. Euro', 'AllianzGI Aufträge wachsen'],
    risks: ['Naturkatastrophen-Häufung', 'Regulatorische Eigenkapitalanforderungen'],
    newsImpact: 'Sehr positiv – Rekordgewinn bestätigt',
    createdAt: new Date().toISOString(),
  },
  {
    id: 5,
    symbol: 'CBK',
    action: 'buy',
    confidence: 76,
    priceTarget: 21,
    currentPrice: 16.52,
    upside: 27.1,
    timeHorizon: '3-6 Monate',
    riskLevel: 'medium',
    reasoning: 'Commerzbank-Aktie profitiert von Übernahmespekulationen durch UniCredit. Starkes organisches Wachstum in der Firmenkundensparte. Niedrige Bewertung (KBV 0.7x) bietet erhebliches Potenzial.',
    catalysts: ['UniCredit-Übernahme', 'Zinsnormalisierung', 'Kostensenkungs-Programm'],
    risks: ['Konjunkturrisiken Deutschland', 'Regulierungsauflagen', 'Übernahme scheitert'],
    newsImpact: 'Positiv – UniCredit erhöht Beteiligung',
    createdAt: new Date().toISOString(),
  },
  {
    id: 6,
    symbol: 'BAYN',
    action: 'sell',
    confidence: 74,
    priceTarget: 22,
    currentPrice: 27.14,
    upside: -18.9,
    timeHorizon: '3-6 Monate',
    riskLevel: 'high',
    reasoning: 'Bayer ist ein klassisches Value-Trap-Risiko. Glyphosat-Verbindlichkeiten sind nicht quantifizierbar, Pharmapipeline enttäuscht, hohe Verschuldung begrenzt Handlungsspielraum. Ohne Durchbruch bei Rechtsstreitigkeiten kein struktureller Aufwärtstrend.',
    catalysts: ['Vergleich in Roundup-Klagen', 'Asundexian-Zulassung', 'Portfoliobereinigung'],
    risks: ['Weitere Gerichtsurteile', 'Pharmapipeline-Rückschläge', 'Schuldenlast 35 Mrd. Euro'],
    newsImpact: 'Sehr negativ – weiteres Gerichtsurteil belastet',
    createdAt: new Date().toISOString(),
  },
  {
    id: 7,
    symbol: 'VOW3',
    action: 'watch',
    confidence: 62,
    priceTarget: 115,
    currentPrice: 103.80,
    upside: 10.8,
    timeHorizon: '6-12 Monate',
    riskLevel: 'high',
    reasoning: 'VW handelt auf historisch niedrigem KGV (3.6x), aber strukturelle Probleme in der E-Mobilität und hohe Fixkosten begrenzen das Aufwärtspotenzial. Restrukturierung schreitet voran – Umsetzungsrisiko bleibt hoch.',
    catalysts: ['Sparprogramm greift', 'China-Erholung', 'ID.-Serie profitabel'],
    risks: ['BYD-Wettbewerb', 'E-Auto-Nachfrage schwach', 'Gewerkschaftskonflikte'],
    newsImpact: 'Gemischt – Kostenreduktion positiv, Marktanteilsverluste negativ',
    createdAt: new Date().toISOString(),
  },
  {
    id: 8,
    symbol: 'MUV2',
    action: 'buy',
    confidence: 85,
    priceTarget: 500,
    currentPrice: 442.50,
    upside: 13.0,
    timeHorizon: '6-12 Monate',
    riskLevel: 'low',
    reasoning: 'Münchener Rück ist das qualitativ hochwertigste Rückversicherungsunternehmen der Welt. Günstige Schadenbilanz 2025, steigende Prämien und exzellentes Underwriting-Ergebnis. Dividendenrendite ~3,5% attraktiv.',
    catalysts: ['Prämiensteigerungen', 'Günstige Schadenbilanz', 'Dividendenerhöhung'],
    risks: ['Großkatastrophen', 'Kumulrisiken Klimawandel'],
    newsImpact: 'Positiv – Schadenbilanz Q1 unter Erwartungen',
    createdAt: new Date().toISOString(),
  },
]

// ─── Deutsche Marktindizes ────────────────────────────────────────────────────
export const MOCK_INDICES = [
  { name: 'DAX',       value: 18748.30, change:  87.60, changePct:  0.47 },
  { name: 'MDAX',      value:  26842.10, change: -42.30, changePct: -0.16 },
  { name: 'TecDAX',    value:   3412.50, change:  28.40, changePct:  0.84 },
  { name: 'SDAX',      value:  14823.60, change:  62.80, changePct:  0.43 },
  { name: 'EuroStoxx', value:   5018.40, change:  23.10, changePct:  0.46 },
  { name: 'EUR/USD',   value:      1.082, change:  0.003, changePct:  0.28 },
  { name: 'Bund 10J',  value:      2.48,  change: -0.04,  changePct: -1.59 },
  { name: 'BTC/EUR',   value:  63420.50, change: 1140.30, changePct:  1.83 },
]

// ─── Sektoren (Deutschland/Europa) ───────────────────────────────────────────
export const MOCK_SECTORS = [
  { name: 'Technologie',       changePct:  1.62, marketCap: 320000000000 },
  { name: 'Luftfahrt',         changePct:  1.48, marketCap: 152000000000 },
  { name: 'Versicherung',      changePct:  0.92, marketCap: 202000000000 },
  { name: 'Automobil',         changePct:  0.74, marketCap: 290000000000 },
  { name: 'Gesundheit',        changePct: -0.42, marketCap: 120000000000 },
  { name: 'Energie',           changePct:  1.28, marketCap:  57000000000 },
  { name: 'Finanzen',          changePct:  1.84, marketCap:  57000000000 },
  { name: 'Chemie',            changePct: -0.32, marketCap: 253000000000 },
]

// ─── Backtest-Daten ───────────────────────────────────────────────────────────
export function generateBacktestData(startCapital = 10000, days = 90) {
  const data = []
  let aiPortfolio = startCapital
  let daxPortfolio = startCapital
  let userPortfolio = startCapital
  const now = new Date()

  for (let i = days; i >= 0; i--) {
    const date = subDays(now, i)
    const aiChange    = (Math.random() - 0.44) * 0.022
    const daxChange   = (Math.random() - 0.47) * 0.013
    const userChange  = (Math.random() - 0.50) * 0.019

    aiPortfolio   *= 1 + aiChange
    daxPortfolio  *= 1 + daxChange
    userPortfolio *= 1 + userChange

    data.push({
      date: format(date, 'dd.MM.'),
      fullDate: format(date, 'yyyy-MM-dd'),
      aiPortfolio:   parseFloat(aiPortfolio.toFixed(2)),
      spPortfolio:   parseFloat(daxPortfolio.toFixed(2)),   // bleibt spPortfolio als Schlüssel
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
