"""
Pipeline Orchestrator
Runs all 5 stages in sequence for a nightly pipeline run.
"""
import logging
import uuid
from datetime import date
from typing import Optional

from .collector import DataCollector
from .cleaner import DataCleaner
from .relevance_scorer import RelevanceScorer
from .clustering import NewsClusterEngine
from .feature_engineer import FeatureEngineer

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    def __init__(self, db_session, config):
        self.db = db_session
        self.config = config
        self.run_id = str(uuid.uuid4())[:8]

    def run(self, target_date: Optional[date] = None) -> dict:
        """
        Execute the full pipeline for a given date.
        Returns summary dict: {run_id, articles_collected, articles_relevant,
                               clusters, snapshots}
        """
        if target_date is None:
            target_date = date.today()

        logger.info(f'=== Pipeline run {self.run_id} started for {target_date} ===')

        # ── Stage 1: Collect ───────────────────────────────────────────────────
        collector = DataCollector(self.db, self.config)
        raw_articles = collector.collect_news(symbols=self.config.TRACKED_SYMBOLS[:10])
        price_data   = collector.collect_prices(self.config.TRACKED_SYMBOLS, period='1y')

        # Persist prices to DB
        self._persist_prices(price_data)

        # ── Stage 2: Clean ────────────────────────────────────────────────────
        cleaner  = DataCleaner()
        articles = cleaner.clean(raw_articles)

        # ── Stage 3: Score ────────────────────────────────────────────────────
        scorer   = RelevanceScorer(threshold=self.config.RELEVANCE_THRESHOLD)
        articles = scorer.score(articles)

        # Persist articles to DB
        self._persist_articles(articles)

        # ── Stage 4: Cluster ──────────────────────────────────────────────────
        cluster_engine = NewsClusterEngine(
            similarity_threshold=self.config.CLUSTER_SIMILARITY
        )
        clusters = cluster_engine.cluster(articles)

        # Persist clusters
        self._persist_clusters(clusters)

        # ── Stage 5: Feature Engineering ──────────────────────────────────────
        engineer  = FeatureEngineer(price_data, clusters, self.config)
        snapshots = engineer.build_all_snapshots(target_date)

        # Persist snapshots
        self._persist_snapshots(snapshots)

        summary = {
            'run_id':             self.run_id,
            'date':               str(target_date),
            'articles_collected': len(raw_articles),
            'articles_relevant':  sum(1 for a in articles if a.get('passes_threshold')),
            'clusters':           len(clusters),
            'snapshots':          len(snapshots),
            'symbols_covered':    [s['symbol'] for s in snapshots],
        }
        logger.info(f'=== Pipeline run {self.run_id} complete: {summary} ===')
        return summary

    # ─── Persistence helpers ──────────────────────────────────────────────────
    def _persist_prices(self, price_data: dict):
        from ..models import StockPrice
        from sqlalchemy.dialects.sqlite import insert as sqlite_insert
        count = 0
        for symbol, rows in price_data.items():
            for row in rows:
                exists = self.db.query(StockPrice).filter_by(
                    symbol=symbol, date=row['date']
                ).first()
                if not exists:
                    self.db.add(StockPrice(symbol=symbol, **row))
                    count += 1
        self.db.commit()
        logger.info(f'Persisted {count} new price rows')

    def _persist_articles(self, articles: list):
        from ..models import NewsArticle
        from datetime import datetime
        count = 0
        for a in articles:
            if not a.get('external_id'):
                continue
            exists = self.db.query(NewsArticle).filter_by(
                external_id=a['external_id']
            ).first()
            if exists:
                continue
            pub = None
            if a.get('published_at'):
                try:
                    pub = datetime.fromisoformat(str(a['published_at']).replace('Z', '+00:00'))
                except Exception:
                    pass
            self.db.add(NewsArticle(
                external_id=a.get('external_id'),
                title=a.get('title', '')[:512],
                summary=(a.get('cleaned_summary') or a.get('summary', ''))[:1000],
                source=a.get('source', ''),
                url=(a.get('url') or '')[:1024],
                published_at=pub,
                is_duplicate=bool(a.get('is_duplicate')),
                cleaned_title=(a.get('cleaned_title') or '')[:512],
                cleaned_summary=(a.get('cleaned_summary') or '')[:1000],
                relevance_score=a.get('relevance_score'),
                source_quality=a.get('source_quality'),
                market_proximity=a.get('market_proximity'),
                event_frequency=a.get('event_frequency'),
                impact_potential=a.get('impact_potential'),
                passes_threshold=bool(a.get('passes_threshold')),
                sentiment_label=a.get('sentiment_label'),
                sentiment_score=a.get('sentiment_score'),
                related_symbols=a.get('related_symbols', []),
            ))
            count += 1
        self.db.commit()
        logger.info(f'Persisted {count} new articles')

    def _persist_clusters(self, clusters: list):
        from ..models import NewsCluster
        for c in clusters:
            self.db.add(NewsCluster(
                topic_label=c.get('topic_label', ''),
                article_count=c.get('article_count', 1),
                symbols=c.get('symbols', []),
                sentiment_avg=c.get('sentiment_avg'),
                impact_max=c.get('impact_max'),
                representative_summary=c.get('representative_summary', ''),
                pipeline_run_id=self.run_id,
            ))
        self.db.commit()

    def _persist_snapshots(self, snapshots: list):
        from ..models import FeatureSnapshot
        for s in snapshots:
            existing = self.db.query(FeatureSnapshot).filter_by(
                symbol=s['symbol'], date=s['date']
            ).first()
            if existing:
                # Update existing snapshot
                for k, v in s.items():
                    if k not in ('symbol', 'date') and hasattr(existing, k):
                        setattr(existing, k, v)
            else:
                self.db.add(FeatureSnapshot(**{
                    k: v for k, v in s.items() if k != 'pipeline_run_id'
                }, pipeline_run_id=self.run_id))
        self.db.commit()
