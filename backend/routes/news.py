"""
News Blueprint – /api/news
"""
import os
from flask import Blueprint, jsonify, request

news_bp = Blueprint('news', __name__, url_prefix='/api/news')


@news_bp.route('')
def get_news():
    symbol   = request.args.get('symbol', '').strip().upper() or None
    limit    = min(int(request.args.get('limit', 20)), 100)
    newsapi_key = os.getenv('NEWSAPI_KEY', '')

    if newsapi_key:
        try:
            import requests as req
            params = {
                'category': 'business',
                'language': 'de',
                'pageSize': limit,
                'apiKey': newsapi_key,
            }
            if symbol:
                params = {
                    'q': f'{symbol} Aktie',
                    'language': 'de',
                    'pageSize': limit,
                    'apiKey': newsapi_key,
                }
                endpoint = 'https://newsapi.org/v2/everything'
            else:
                endpoint = 'https://newsapi.org/v2/top-headlines'

            resp = req.get(endpoint, params=params, timeout=10)
            if resp.ok:
                articles = resp.json().get('articles', [])
                return jsonify([
                    {
                        'id':           i,
                        'title':        a.get('title', ''),
                        'source':       a.get('source', {}).get('name', ''),
                        'publishedAt':  a.get('publishedAt', ''),
                        'summary':      a.get('description', ''),
                        'url':          a.get('url', ''),
                        'imageUrl':     a.get('urlToImage'),
                        'sentiment':    'neutral',
                        'impact':       'medium',
                        'relatedSymbols': [],
                    }
                    for i, a in enumerate(articles)
                    if a.get('title') and '[Removed]' not in a.get('title', '')
                ])
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'NewsAPI key not configured'}), 503


@news_bp.route('/trending')
def get_trending():
    """Return trending topics based on recent DB article clusters."""
    try:
        from ..models import SessionLocal, NewsCluster
        db = SessionLocal()
        try:
            clusters = (
                db.query(NewsCluster)
                .order_by(NewsCluster.id.desc())
                .limit(10)
                .all()
            )
            if clusters:
                return jsonify([
                    {
                        'topic':     c.topic_label,
                        'count':     c.article_count,
                        'sentiment': 'positive' if (c.sentiment_avg or 0) > 0.1
                                     else 'negative' if (c.sentiment_avg or 0) < -0.1
                                     else 'neutral',
                    }
                    for c in clusters
                ])
        finally:
            db.close()
    except Exception:
        pass

    # Static fallback when DB/pipeline not yet run
    return jsonify([
        {'topic': 'SAP Cloud-Wachstum',         'count': 42, 'sentiment': 'positive'},
        {'topic': 'EZB Zinsentscheid',           'count': 38, 'sentiment': 'positive'},
        {'topic': 'Bayer Glyphosat-Klagen',      'count': 31, 'sentiment': 'negative'},
        {'topic': 'Airbus Produktionserhöhung',  'count': 28, 'sentiment': 'positive'},
        {'topic': 'Volkswagen Restrukturierung', 'count': 24, 'sentiment': 'neutral' },
    ])
