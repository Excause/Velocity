"""
Stage 5 – Feature Engineer
Builds a structured FeatureSnapshot for each symbol.
This is the last step before the AI Decision Layer.
"""
import logging
import math
from datetime import date, timedelta
from typing import List, Optional

logger = logging.getLogger(__name__)


class FeatureEngineer:
    def __init__(self, price_data: dict, clusters: List[dict], config):
        """
        price_data: {symbol: [{'date', 'close', ...}]} – from Stage 1
        clusters:   output of Stage 4 NewsClusterEngine
        config:     Config object
        """
        self.prices  = price_data
        self.clusters = clusters
        self.config  = config

    def build_snapshot(self, symbol: str, target_date: Optional[date] = None) -> Optional[dict]:
        """
        Build a feature snapshot for `symbol` as of `target_date`.
        Returns dict compatible with FeatureSnapshot.to_ai_input().
        """
        if target_date is None:
            target_date = date.today()

        price_rows = self.prices.get(symbol, [])
        if not price_rows:
            logger.warning(f'No price data for {symbol} – skipping feature engineering')
            return None

        # Sort by date
        price_rows = sorted(price_rows, key=lambda r: r['date'])
        # Filter to rows up to target_date
        available = [r for r in price_rows if r['date'] <= target_date]
        if len(available) < 2:
            logger.warning(f'Insufficient price history for {symbol}')
            return None

        current_price = available[-1]['close']

        # ── Price Momentum ─────────────────────────────────────────────────────
        momentum_5d  = self._momentum(available, 5)
        momentum_20d = self._momentum(available, 20)

        # ── Volatility ─────────────────────────────────────────────────────────
        volatility_20d = self._realized_volatility(available, 20)

        # ── Relative Strength vs DAX ───────────────────────────────────────────
        dax_prices = self.prices.get('DAX', [])
        rel_strength = self._relative_strength(available, dax_prices, 20)

        # ── News / Sentiment features ──────────────────────────────────────────
        symbol_clusters = [c for c in self.clusters if symbol in (c.get('symbols') or [])]

        sentiment_24h, count_24h = self._aggregate_sentiment(symbol_clusters, days=1)
        sentiment_7d,  count_7d  = self._aggregate_sentiment(symbol_clusters, days=7)

        high_impact = sum(
            1 for c in symbol_clusters if (c.get('impact_max') or 0) >= 0.7
        )

        # Top cluster for this symbol = highest impact one
        top_cluster = None
        if symbol_clusters:
            best = max(symbol_clusters, key=lambda c: c.get('impact_max') or 0)
            top_cluster = best.get('representative_summary', '')[:256]

        snapshot = {
            'symbol':               symbol,
            'date':                 target_date,
            'price_current':        round(current_price, 2),
            'price_momentum_5d':    round(momentum_5d or 0, 2),
            'price_momentum_20d':   round(momentum_20d or 0, 2),
            'volatility_20d':       round(volatility_20d or 0, 4),
            'relative_strength_dax': round(rel_strength or 0, 2),
            # Valuation placeholders – enriched from Finnhub/yfinance info endpoint
            'pe_ratio':             None,
            'market_cap_eur':       None,
            # Sentiment
            'sentiment_score_24h':  round(sentiment_24h, 3),
            'sentiment_score_7d':   round(sentiment_7d, 3),
            'news_count_24h':       count_24h,
            'news_count_7d':        count_7d,
            'high_impact_count_7d': high_impact,
            'top_cluster_summary':  top_cluster,
            # Event flags
            'earnings_days_away':   None,
            'has_guidance_update':  0,
            'has_analyst_revision': 0,
            'has_insider_activity': 0,
        }

        # Check clusters for event flags
        for cluster in symbol_clusters:
            summary = (cluster.get('representative_summary') or '').lower()
            if any(w in summary for w in ['prognose', 'guidance', 'ausblick', 'erwartungen angehoben']):
                snapshot['has_guidance_update'] = 1
            if any(w in summary for w in ['analyst', 'kursziel', 'hochstufung', 'abstufung']):
                snapshot['has_analyst_revision'] = 1
            if any(w in summary for w in ['insider', 'vorstand', 'aktien gekauft', 'aktien verkauft']):
                snapshot['has_insider_activity'] = 1

        snapshot['raw_features'] = {
            'cluster_count': len(symbol_clusters),
            'cluster_topics': [c.get('topic_label') for c in symbol_clusters[:5]],
        }

        return snapshot

    def build_all_snapshots(self, target_date: Optional[date] = None) -> List[dict]:
        """Build snapshots for all tracked symbols."""
        snapshots = []
        for symbol in self.config.TRACKED_SYMBOLS:
            snap = self.build_snapshot(symbol, target_date)
            if snap:
                snapshots.append(snap)
        logger.info(f'Stage 5: Built {len(snapshots)} feature snapshots')
        return snapshots

    # ─── Helpers ──────────────────────────────────────────────────────────────
    @staticmethod
    def _momentum(rows: List[dict], lookback: int) -> Optional[float]:
        if len(rows) < lookback + 1:
            return None
        current = rows[-1]['close']
        past    = rows[-lookback - 1]['close']
        if past == 0:
            return None
        return (current - past) / past * 100

    @staticmethod
    def _realized_volatility(rows: List[dict], lookback: int) -> Optional[float]:
        """Annualized realized volatility from daily log returns."""
        if len(rows) < lookback + 1:
            return None
        closes = [r['close'] for r in rows[-lookback:]]
        log_returns = [
            math.log(closes[i] / closes[i - 1])
            for i in range(1, len(closes))
            if closes[i - 1] > 0
        ]
        if len(log_returns) < 2:
            return None
        n = len(log_returns)
        mean = sum(log_returns) / n
        variance = sum((r - mean) ** 2 for r in log_returns) / (n - 1)
        return math.sqrt(variance * 252)  # annualized

    @staticmethod
    def _relative_strength(symbol_rows: List[dict], dax_rows: List[dict], lookback: int) -> Optional[float]:
        """Symbol momentum minus DAX momentum over lookback days."""
        if not dax_rows or len(symbol_rows) < lookback + 1:
            return None
        dax_sorted = sorted(dax_rows, key=lambda r: r['date'])
        dax_available = [r for r in dax_sorted if r['date'] <= symbol_rows[-1]['date']]
        if len(dax_available) < lookback + 1:
            return None
        sym_return = (symbol_rows[-1]['close'] - symbol_rows[-lookback]['close']) / symbol_rows[-lookback]['close'] * 100
        dax_return = (dax_available[-1]['close'] - dax_available[-lookback]['close']) / dax_available[-lookback]['close'] * 100
        return sym_return - dax_return

    @staticmethod
    def _aggregate_sentiment(clusters: List[dict], days: int) -> tuple:
        """Returns (avg_sentiment_score, article_count) for given day window."""
        relevant = clusters  # In a real system, filter by cluster.created_at within `days`
        if not relevant:
            return 0.0, 0
        scores = [c.get('sentiment_avg', 0) for c in relevant]
        counts = [c.get('article_count', 1) for c in relevant]
        total_articles = sum(counts)
        weighted_sentiment = sum(s * c for s, c in zip(scores, counts)) / max(total_articles, 1)
        return weighted_sentiment, total_articles
