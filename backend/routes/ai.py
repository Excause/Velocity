"""
AI Blueprint – /api/ai
All AI calls go through the Decision Layer; no raw data reaches Claude directly.
"""
import os
from flask import Blueprint, jsonify, request

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


def _get_client():
    try:
        import anthropic
        key = os.getenv('ANTHROPIC_API_KEY', '')
        if not key:
            return None
        return anthropic.Anthropic(api_key=key)
    except Exception:
        return None


@ai_bp.route('/analyze', methods=['POST'])
def analyze_stock():
    """
    Analyze a single stock.
    Expects: { symbol, featureSnapshot? }
    If a FeatureSnapshot exists in the DB it is used; otherwise a live snapshot
    is built from the feature engineer and passed through the Decision Layer.
    """
    data   = request.get_json() or {}
    symbol = (data.get('symbol') or '').strip().upper()
    if not symbol:
        return jsonify({'error': 'symbol required'}), 400

    try:
        from ..models import SessionLocal, FeatureSnapshot
        from ..config import config
        from ..ai     import DecisionLayer

        db   = SessionLocal()
        try:
            snap = (
                db.query(FeatureSnapshot)
                .filter_by(symbol=symbol)
                .order_by(FeatureSnapshot.date.desc())
                .first()
            )

            if snap:
                feature_dict = snap.to_ai_input()
            else:
                # Build a live minimal snapshot from yfinance
                feature_dict = _build_live_snapshot(symbol, config)

            layer  = DecisionLayer(config)
            output = layer.decide(feature_dict)
            return jsonify(output.to_dict())
        finally:
            db.close()

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/recommendations')
def get_recommendations():
    """Return the latest AI recommendations from the DB."""
    limit        = min(int(request.args.get('limit', 20)), 100)
    risk_profile = request.args.get('riskProfile', 'moderate')

    risk_map = {
        'conservative': ['low'],
        'moderate':     ['low', 'medium'],
        'aggressive':   ['low', 'medium', 'high'],
    }
    allowed_risks = risk_map.get(risk_profile, risk_map['moderate'])

    try:
        from ..models import SessionLocal, Recommendation
        db = SessionLocal()
        try:
            recos = (
                db.query(Recommendation)
                .filter(Recommendation.risk_level.in_(allowed_risks))
                .order_by(Recommendation.generated_date.desc())
                .limit(limit)
                .all()
            )
            if recos:
                return jsonify([r.to_dict() for r in recos])
        finally:
            db.close()
    except Exception:
        pass

    # Fallback: empty list (pipeline hasn't run yet)
    return jsonify([])


@ai_bp.route('/morning-report', methods=['POST'])
def morning_report():
    data            = request.get_json() or {}
    recommendations = data.get('recommendations', [])
    news            = data.get('news', [])

    client = _get_client()
    if not client:
        return jsonify({'error': 'Anthropic API key not configured'}), 503

    reco_text = '\n'.join([
        f"{r.get('symbol', '')}: {r.get('action', '').upper()} (Konfidenz: {r.get('confidence', 0)}%)"
        for r in recommendations[:5]
    ])
    news_text = '\n'.join([f"- {n.get('title', '')}" for n in news[:5]])

    prompt = f"""Erstelle einen prägnanten Börsenmorgen-Report für DAX-Investoren (max. 150 Wörter, Deutsch).

KI-Empfehlungen:
{reco_text or 'Keine Empfehlungen.'}

Nachrichten:
{news_text or 'Keine Nachrichten.'}

Format: Marktausblick (2 Sätze), Top-Empfehlung (2 Sätze), Hauptrisiko (1 Satz).
Stil: Professionell, präzise."""

    try:
        msg = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=512,
            messages=[{'role': 'user', 'content': prompt}],
        )
        return jsonify({'report': msg.content[0].text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Helper ────────────────────────────────────────────────────────────────────

def _build_live_snapshot(symbol: str, config) -> dict:
    """Build a minimal FeatureSnapshot dict from live yfinance data."""
    try:
        import yfinance as yf
        yf_sym = config.to_yahoo_symbol(symbol)
        ticker = yf.Ticker(yf_sym)
        hist   = ticker.history(period='1mo', interval='1d')

        if hist.empty:
            raise ValueError(f'No yfinance data for {symbol}')

        closes = hist['Close'].dropna().tolist()
        current = closes[-1]
        mom_5d  = ((current - closes[-6])  / closes[-6]  * 100) if len(closes) >= 6  else 0
        mom_20d = ((current - closes[-21]) / closes[-21] * 100) if len(closes) >= 21 else 0

        import math, statistics
        returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
        vol_20d = statistics.stdev(returns[-20:]) * math.sqrt(252) * 100 if len(returns) >= 2 else 0

        return {
            'symbol': symbol,
            'date':   str(hist.index[-1].date()),
            'price': {
                'current':          round(current, 2),
                'momentum_5d_pct':  round(mom_5d,  2),
                'momentum_20d_pct': round(mom_20d, 2),
                'volatility_20d':   round(vol_20d, 2),
            },
            'sentiment': {
                'score_24h': 0,
                'score_7d':  0,
                'news_count_24h': 0,
                'news_count_7d':  0,
                'high_impact_7d': 0,
                'top_cluster':    '',
            },
            'events': {
                'earnings_days_away':  None,
                'guidance_update':     False,
                'analyst_revision':    False,
                'insider_activity':    False,
            },
        }
    except Exception as e:
        raise ValueError(f'Could not build live snapshot for {symbol}: {e}')
