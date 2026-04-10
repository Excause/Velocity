"""
Stage 1 – Data Collector
Fetches raw news and price data from external APIs.
Saves raw records to the database without any processing.
"""
import hashlib
import logging
from datetime import datetime, timedelta
from typing import List, Optional

logger = logging.getLogger(__name__)


class DataCollector:
    def __init__(self, db_session, config):
        self.db = db_session
        self.config = config

    # ─── News Collection ───────────────────────────────────────────────────────
    def collect_news(self, symbols: Optional[List[str]] = None) -> List[dict]:
        """
        Collect financial news from all configured sources.
        Returns list of raw article dicts – no processing yet.
        """
        articles = []

        # NewsAPI (German business news)
        if self.config.NEWSAPI_KEY:
            articles.extend(self._fetch_newsapi())

        # GNews (German language)
        # Add here if GNews key is configured

        # Finnhub company news
        if self.config.FINNHUB_KEY and symbols:
            for symbol in symbols[:10]:  # Rate limit awareness
                articles.extend(self._fetch_finnhub_news(symbol))

        logger.info(f'Stage 1: Collected {len(articles)} raw articles')
        return articles

    def _fetch_newsapi(self) -> List[dict]:
        try:
            import requests
            resp = requests.get(
                'https://newsapi.org/v2/top-headlines',
                params={
                    'category': 'business',
                    'language': 'de',
                    'pageSize': 100,
                    'apiKey': self.config.NEWSAPI_KEY,
                },
                timeout=10,
            )
            if not resp.ok:
                return []
            data = resp.json()
            return [
                {
                    'external_id': hashlib.md5(a.get('url', a['title']).encode()).hexdigest(),
                    'title':       a.get('title', ''),
                    'summary':     a.get('description', ''),
                    'source':      a.get('source', {}).get('name', ''),
                    'url':         a.get('url', ''),
                    'published_at': a.get('publishedAt'),
                    '_raw_source': 'newsapi',
                }
                for a in data.get('articles', [])
                if a.get('title') and '[Removed]' not in a.get('title', '')
            ]
        except Exception as e:
            logger.error(f'NewsAPI fetch failed: {e}')
            return []

    def _fetch_finnhub_news(self, symbol: str) -> List[dict]:
        try:
            import requests
            from datetime import date
            today = date.today()
            week_ago = today - timedelta(days=7)
            fh_symbol = self.config.to_finnhub_symbol(symbol)
            resp = requests.get(
                'https://finnhub.io/api/v1/company-news',
                params={
                    'symbol': fh_symbol,
                    'from': str(week_ago),
                    'to': str(today),
                    'token': self.config.FINNHUB_KEY,
                },
                timeout=10,
            )
            if not resp.ok:
                return []
            return [
                {
                    'external_id': hashlib.md5(str(a.get('id', a.get('url', ''))).encode()).hexdigest(),
                    'title':       a.get('headline', ''),
                    'summary':     a.get('summary', ''),
                    'source':      a.get('source', ''),
                    'url':         a.get('url', ''),
                    'published_at': datetime.utcfromtimestamp(a['datetime']).isoformat() if a.get('datetime') else None,
                    '_raw_source': 'finnhub',
                    '_hint_symbol': symbol,
                }
                for a in resp.json()
                if a.get('headline')
            ]
        except Exception as e:
            logger.error(f'Finnhub news fetch for {symbol} failed: {e}')
            return []

    # ─── Price Collection ──────────────────────────────────────────────────────
    def collect_prices(self, symbols: List[str], period: str = '1y') -> dict:
        """
        Collect historical OHLCV data for all tracked symbols via yfinance.
        Returns dict: {symbol: [{'date', 'open', 'high', 'low', 'close', 'volume'}]}
        """
        try:
            import yfinance as yf
        except ImportError:
            logger.warning('yfinance not installed')
            return {}

        result = {}
        for symbol in symbols:
            try:
                yahoo_sym = self.config.to_yahoo_symbol(symbol)
                ticker = yf.Ticker(yahoo_sym)
                hist = ticker.history(period=period, interval='1d', auto_adjust=True)
                if hist.empty:
                    logger.warning(f'No price data for {symbol}')
                    continue
                rows = []
                for dt, row in hist.iterrows():
                    rows.append({
                        'date':   dt.date(),
                        'open':   round(float(row['Open']), 2),
                        'high':   round(float(row['High']), 2),
                        'low':    round(float(row['Low']), 2),
                        'close':  round(float(row['Close']), 2),
                        'volume': int(row['Volume']),
                    })
                result[symbol] = rows
                logger.debug(f'Collected {len(rows)} price rows for {symbol}')
            except Exception as e:
                logger.error(f'Price collection failed for {symbol}: {e}')
        logger.info(f'Stage 1: Collected prices for {len(result)}/{len(symbols)} symbols')
        return result
