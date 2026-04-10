from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Boolean, ForeignKey, JSON
from .base import Base


class NewsArticle(Base):
    """
    A single news article after ingestion.
    Goes through: raw → cleaned → scored → clustered
    """
    __tablename__ = 'news_articles'

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    external_id        = Column(String(128), unique=True, nullable=True)  # hash of URL/title
    title              = Column(String(512), nullable=False)
    summary            = Column(Text, nullable=True)
    source             = Column(String(128), nullable=True)
    url                = Column(String(1024), nullable=True)
    published_at       = Column(DateTime, nullable=True)
    ingested_at        = Column(DateTime, default=datetime.utcnow)

    # ── Stage 1: Cleaning ─────────────────────────────────────────────────────
    is_duplicate       = Column(Boolean, default=False)
    cleaned_title      = Column(String(512), nullable=True)
    cleaned_summary    = Column(Text, nullable=True)

    # ── Stage 2: Relevance Scoring ────────────────────────────────────────────
    relevance_score    = Column(Float, nullable=True)   # 0.0 – 1.0
    source_quality     = Column(Float, nullable=True)   # 0.0 – 1.0
    market_proximity   = Column(Float, nullable=True)   # how close to listed companies
    event_frequency    = Column(Float, nullable=True)   # similar events in last 24h
    impact_potential   = Column(Float, nullable=True)   # estimated price impact strength
    passes_threshold   = Column(Boolean, default=False) # relevance >= RELEVANCE_THRESHOLD

    # ── Stage 3: Sentiment ─────────────────────────────────────────────────────
    sentiment_label    = Column(String(16), nullable=True)  # positive/negative/neutral
    sentiment_score    = Column(Float, nullable=True)       # -1.0 to +1.0

    # ── Stage 4: Entity Extraction ─────────────────────────────────────────────
    related_symbols    = Column(JSON, default=list)   # ['SAP', 'SIE']
    mentioned_entities = Column(JSON, default=list)

    # ── Stage 5: Clustering ────────────────────────────────────────────────────
    cluster_id         = Column(Integer, ForeignKey('news_clusters.id'), nullable=True)

    def to_dict(self):
        return {
            'id':             self.id,
            'title':          self.title,
            'summary':        self.summary,
            'source':         self.source,
            'url':            self.url,
            'publishedAt':    self.published_at.isoformat() if self.published_at else None,
            'sentiment':      self.sentiment_label,
            'sentimentScore': self.sentiment_score,
            'relatedSymbols': self.related_symbols or [],
            'relevanceScore': self.relevance_score,
            'impact':         self._impact_label(),
            'clusterId':      self.cluster_id,
        }

    def _impact_label(self):
        if self.impact_potential is None:
            return 'medium'
        if self.impact_potential >= 0.7:
            return 'high'
        if self.impact_potential >= 0.4:
            return 'medium'
        return 'low'


class NewsCluster(Base):
    """
    A group of similar news articles about the same event/topic.
    The cluster summary is what gets passed to the AI.
    """
    __tablename__ = 'news_clusters'

    id               = Column(Integer, primary_key=True, autoincrement=True)
    topic_label      = Column(String(256), nullable=True)    # human-readable topic
    article_count    = Column(Integer, default=1)
    symbols          = Column(JSON, default=list)            # affected symbols
    sentiment_avg    = Column(Float, nullable=True)          # avg sentiment of cluster
    impact_max       = Column(Float, nullable=True)          # max impact in cluster
    representative_summary = Column(Text, nullable=True)     # best-of summary for AI
    created_at       = Column(DateTime, default=datetime.utcnow)
    pipeline_run_id  = Column(String(64), nullable=True)     # ties to nightly run

    def to_dict(self):
        return {
            'id':          self.id,
            'topic':       self.topic_label,
            'articleCount': self.article_count,
            'symbols':     self.symbols or [],
            'sentimentAvg': self.sentiment_avg,
            'summary':     self.representative_summary,
        }
