from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Date, JSON
from .base import Base


class FeatureSnapshot(Base):
    """
    Structured feature vector computed for one symbol on one date.
    This is the ONLY input the AI Decision Layer ever receives.
    No raw news, no raw prices – only computed, normalized features.
    """
    __tablename__ = 'feature_snapshots'

    id     = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(16), nullable=False, index=True)
    date   = Column(Date, nullable=False, index=True)

    # ── Price features ────────────────────────────────────────────────────────
    price_current          = Column(Float)   # latest close
    price_momentum_5d      = Column(Float)   # % change vs 5d ago
    price_momentum_20d     = Column(Float)   # % change vs 20d ago
    volatility_20d         = Column(Float)   # 20d realized volatility (annualized)
    relative_strength_dax  = Column(Float)   # price momentum vs DAX over 20d

    # ── Valuation ─────────────────────────────────────────────────────────────
    pe_ratio               = Column(Float, nullable=True)
    market_cap_eur         = Column(Float, nullable=True)

    # ── News / Sentiment features ─────────────────────────────────────────────
    sentiment_score_24h    = Column(Float)   # avg weighted sentiment last 24h
    sentiment_score_7d     = Column(Float)   # avg weighted sentiment last 7d
    news_count_24h         = Column(Integer, default=0)
    news_count_7d          = Column(Integer, default=0)
    high_impact_count_7d   = Column(Integer, default=0)
    top_cluster_summary    = Column(String(512), nullable=True)  # most relevant cluster

    # ── Event flags ───────────────────────────────────────────────────────────
    earnings_days_away     = Column(Integer, nullable=True)  # None = unknown
    has_guidance_update    = Column(Integer, default=0)      # 0/1
    has_analyst_revision   = Column(Integer, default=0)      # 0/1
    has_insider_activity   = Column(Integer, default=0)      # 0/1

    # ── Raw snapshot for audit ─────────────────────────────────────────────────
    raw_features           = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    pipeline_run_id = Column(String(64), nullable=True)

    def to_ai_input(self) -> dict:
        """
        Returns a clean, structured dict that goes directly to the AI Decision Layer.
        Never includes raw news text or unprocessed data.
        """
        return {
            'symbol': self.symbol,
            'date': str(self.date),
            'price': {
                'current':          round(self.price_current or 0, 2),
                'momentum_5d_pct':  round(self.price_momentum_5d or 0, 2),
                'momentum_20d_pct': round(self.price_momentum_20d or 0, 2),
                'volatility_20d':   round(self.volatility_20d or 0, 4),
                'vs_dax_20d_pct':   round(self.relative_strength_dax or 0, 2),
            },
            'valuation': {
                'pe_ratio':    self.pe_ratio,
                'market_cap':  self.market_cap_eur,
            },
            'sentiment': {
                'score_24h':         round(self.sentiment_score_24h or 0, 3),
                'score_7d':          round(self.sentiment_score_7d or 0, 3),
                'news_count_24h':    self.news_count_24h,
                'news_count_7d':     self.news_count_7d,
                'high_impact_count': self.high_impact_count_7d,
                'top_event':         self.top_cluster_summary,
            },
            'events': {
                'earnings_days_away':  self.earnings_days_away,
                'guidance_update':     bool(self.has_guidance_update),
                'analyst_revision':    bool(self.has_analyst_revision),
                'insider_activity':    bool(self.has_insider_activity),
            },
        }
