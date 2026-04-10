# ⚡ Velocity – KI-gestützte Aktienanalyse

> KI-gestützte Investment-Assistenz mit Echtzeit-Marktdaten, News-Analyse und Paper-Trading-Simulator.

**Live-Demo:** [excause.github.io/Velocity](https://excause.github.io/Velocity)

---

## Features

| Feature | Beschreibung |
|---------|-------------|
| **News-Analyse** | KI-analysierte Finanznachrichten mit Sentiment-Scoring |
| **Aktienkurse** | Live-Kurse, Charts (1W–1J), Watchlist & Kursalarme |
| **KI-Empfehlungen** | Claude-basierte Buy/Sell/Watch-Empfehlungen mit Begründung |
| **Simulator** | Paper-Trading mit $10.000 virtuellem Kapital |
| **Backtesting** | „Was wäre wenn"-Vergleich: Velocity KI vs. S&P 500 |
| **Morgen-Report** | Automatisch generierter Tagesausblick vor Börsenstart |

---

## Schnellstart (Frontend / Demo)

Die App läuft sofort **ohne API-Keys** mit realistischen Demo-Daten:

1. Öffne [excause.github.io/Velocity](https://excause.github.io/Velocity)
2. Erkunde Dashboard, Nachrichten, Empfehlungen und Simulator

### API-Keys konfigurieren (für Live-Daten)

Klicke auf das ⚙️ Einstellungen-Symbol und trage ein:
- **Finnhub** (kostenlos): [finnhub.io/register](https://finnhub.io/register) → für Echtzeit-Kurse
- **GNews** (kostenlos): [gnews.io](https://gnews.io/) → für Live-Nachrichten
- **Anthropic** (kostenpflichtig): [console.anthropic.com](https://console.anthropic.com/) → für echte KI-Analysen

---

## Lokale Entwicklung

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend (Python)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # API-Keys eintragen
python app.py
# → http://localhost:5000
```

### Nacht-Analyse manuell ausführen

```bash
cd backend
python scheduler/night_analysis.py
```

---

## Technologie-Stack

```
Frontend:  React 18 + Vite + Tailwind CSS + Recharts
Backend:   Python Flask + yfinance + APScheduler
KI:        Anthropic Claude (claude-opus-4-6)
Daten:     Finnhub (Kurse) · GNews/NewsAPI (Nachrichten)
Hosting:   GitHub Pages (Frontend) + lokaler Server (Backend)
```

---

## Neue Datenquelle integrieren

1. **Stock-API**: Füge einen neuen Provider in `frontend/src/services/stockService.js` hinzu
2. **News-API**: Erweitere `frontend/src/services/newsService.js`
3. **Backend**: Neue Route in `backend/app.py` → `@app.route('/api/...')`

---

## Geplante Erweiterungen

- [ ] Kryptowährungen & ETFs
- [ ] Personalisierte E-Mail-Benachrichtigungen (SendGrid)
- [ ] Erweiterte Backtesting-Algorithmen
- [ ] Mobile App (React Native)
- [ ] PostgreSQL für Produktionsdaten

---

## Lizenz & Haftungsausschluss

> **Risikohinweis:** Diese Plattform dient ausschließlich zu Informations- und Bildungszwecken.
> Die KI-generierten Empfehlungen stellen **keine Anlageberatung** dar.
> Investitionen in Aktien sind mit Verlustrisiken verbunden.
> Vergangene Wertentwicklungen sind kein Indikator für zukünftige Ergebnisse.

MIT License · © 2025 Excause
