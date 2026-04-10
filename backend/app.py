"""
Velocity Backend – Flask API
Run: python app.py
"""
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'https://excause.github.io'])

# ─── Lazy imports (avoid errors if packages missing) ─────────────────────────
def get_yfinance():
    try:
        import yfinance as yf
        return yf
    except ImportError:
        return None

def get_anthropic():
    try:
        import anthropic
        return anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY', ''))
    except (ImportError, Exception):
        return None


# ─── Stock Endpoints ─────────────────────────────────────────────────────────
@app.route('/api/stocks/quote/<symbol>')
def get_quote(symbol):
    yf = get_yfinance()
    if not yf:
        return jsonify({'error': 'yfinance not installed'}), 503

    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.fast_info
        hist = ticker.history(period='1d', interval='1m')

        if hist.empty:
            return jsonify({'error': 'No data'}), 404

        last = hist.iloc[-1]
        prev_close = info.previous_close if hasattr(info, 'previous_close') else last['Close']
        price = float(last['Close'])
        change = price - float(prev_close)
        change_pct = (change / float(prev_close)) * 100

        return jsonify({
            'symbol': symbol.upper(),
            'price': round(price, 2),
            'change': round(change, 2),
            'changePct': round(change_pct, 2),
            'volume': int(last['Volume']),
            'high': round(float(last['High']), 2),
            'low': round(float(last['Low']), 2),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stocks/history/<symbol>')
def get_history(symbol):
    yf = get_yfinance()
    if not yf:
        return jsonify({'error': 'yfinance not installed'}), 503

    range_map = {
        '1W': ('7d', '1h'),
        '1M': ('1mo', '1d'),
        '3M': ('3mo', '1d'),
        '6M': ('6mo', '1d'),
        '1Y': ('1y', '1d'),
    }
    range_key = request.args.get('range', '3M')
    period, interval = range_map.get(range_key, ('3mo', '1d'))

    try:
        ticker = yf.Ticker(symbol.upper())
        hist = ticker.history(period=period, interval=interval)
        if hist.empty:
            return jsonify([])

        data = []
        for dt, row in hist.iterrows():
            data.append({
                'date': dt.strftime('%Y-%m-%d'),
                'open': round(float(row['Open']), 2),
                'high': round(float(row['High']), 2),
                'low': round(float(row['Low']), 2),
                'close': round(float(row['Close']), 2),
                'volume': int(row['Volume']),
            })
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stocks/search')
def search_stocks():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])

    yf = get_yfinance()
    if not yf:
        return jsonify({'error': 'yfinance not installed'}), 503

    try:
        results = yf.Search(query, max_results=10)
        quotes = results.quotes if hasattr(results, 'quotes') else []
        return jsonify([{
            'symbol': q.get('symbol', ''),
            'name': q.get('longname', q.get('shortname', '')),
            'exchange': q.get('exchange', ''),
        } for q in quotes])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── News Endpoint ────────────────────────────────────────────────────────────
@app.route('/api/news')
def get_news():
    try:
        from newsapi import NewsApiClient
        api_key = os.getenv('NEWSAPI_KEY')
        if not api_key:
            return jsonify({'error': 'No NewsAPI key configured'}), 503

        client = NewsApiClient(api_key=api_key)
        articles = client.get_top_headlines(
            category='business',
            language='de',
            page_size=20,
        )

        return jsonify(articles.get('articles', []))
    except ImportError:
        return jsonify({'error': 'newsapi-python not installed'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── AI Analysis Endpoint ─────────────────────────────────────────────────────
@app.route('/api/ai/analyze', methods=['POST'])
def analyze_stock():
    data = request.get_json()
    symbol = data.get('symbol', '')
    news_context = data.get('news', [])

    client = get_anthropic()
    if not client:
        return jsonify({'error': 'Anthropic not configured'}), 503

    news_text = '\n'.join([f"- {n.get('title', '')}: {n.get('description', '')}" for n in news_context[:5]])

    prompt = f"""Du bist ein erfahrener Finanzanalyst. Analysiere die Aktie {symbol}.

Aktuelle Nachrichten:
{news_text or 'Keine spezifischen Nachrichten verfügbar.'}

Erstelle eine JSON-Analyse mit diesen Feldern:
- action: "buy" | "sell" | "watch"
- confidence: Zahl 0-100
- priceTargetChange: Prozentuale Kurszielanderung (z.B. 12.5 für +12.5%)
- timeHorizon: "1-3 Monate" | "3-6 Monate" | "6-12 Monate"
- riskLevel: "low" | "medium" | "high"
- reasoning: Begründung (3-4 Sätze, Deutsch)
- catalysts: Liste von 3 Katalysatoren
- risks: Liste von 3 Risiken

Antwort NUR als gültiges JSON."""

    try:
        message = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=1024,
            messages=[{'role': 'user', 'content': prompt}],
        )
        import json
        text = message.content[0].text
        # Extract JSON
        import re
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            return jsonify(json.loads(json_match.group()))
        return jsonify({'reasoning': text, 'action': 'watch', 'confidence': 60})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/morning-report', methods=['POST'])
def morning_report():
    data = request.get_json()
    recommendations = data.get('recommendations', [])
    news = data.get('news', [])

    client = get_anthropic()
    if not client:
        return jsonify({'error': 'Anthropic not configured'}), 503

    reco_text = '\n'.join([
        f"{r.get('symbol', '')}: {r.get('action', '').upper()} (Konfidenz: {r.get('confidence', 0)}%)"
        for r in recommendations[:5]
    ])
    news_text = '\n'.join([f"- {n.get('title', '')}" for n in news[:5]])

    prompt = f"""Erstelle einen prägnanten Börsenmorgen-Report für Investoren (Deutsch, max. 200 Wörter).

KI-Empfehlungen heute:
{reco_text}

Wichtigste Nachrichten:
{news_text}

Format: Marktausblick, Top-Empfehlung mit Begründung, Risikohinweis.
Stil: Professionell und direkt."""

    try:
        message = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=512,
            messages=[{'role': 'user', 'content': prompt}],
        )
        return jsonify({'report': message.content[0].text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Scheduler (Night Analysis) ───────────────────────────────────────────────
def setup_scheduler():
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()

        def night_analysis():
            """Runs nightly at 23:00 - collect and cluster news"""
            app.logger.info('Night analysis job started...')
            # In production: fetch news, run AI analysis, store results
            app.logger.info('Night analysis complete.')

        def pre_market_report():
            """Runs at 08:30 - generate and send morning reports"""
            app.logger.info('Pre-market report generation started...')
            # In production: generate personalized reports, send emails
            app.logger.info('Pre-market reports sent.')

        scheduler.add_job(night_analysis, 'cron', hour=23, minute=0)
        scheduler.add_job(pre_market_report, 'cron', hour=8, minute=30)
        scheduler.start()
        return scheduler
    except ImportError:
        app.logger.warning('APScheduler not installed, skipping scheduler setup')
        return None


# ─── Health check ─────────────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'services': {
            'yfinance': get_yfinance() is not None,
            'anthropic': bool(os.getenv('ANTHROPIC_API_KEY')),
            'newsapi': bool(os.getenv('NEWSAPI_KEY')),
        }
    })


if __name__ == '__main__':
    scheduler = setup_scheduler()
    try:
        print('\n🚀 Velocity Backend gestartet')
        print('   → http://localhost:5000')
        print('   → API docs: http://localhost:5000/api/health\n')
        app.run(debug=True, port=5000, host='0.0.0.0')
    finally:
        if scheduler:
            scheduler.shutdown()
