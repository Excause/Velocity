from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Date, Text, JSON, Boolean
from .base import Base


class Recommendation(Base):
    """
    AI-generated investment recommendation.
    Always derived from a FeatureSnapshot – never from raw data.
    """
    __tablename__ = 'recommendations'

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    symbol             = Column(String(16), nullable=False, index=True)
    generated_date     = Column(Date, nullable=False, index=True)
    feature_snapshot_id = Column(Integer, nullable=True)   # FK to FeatureSnapshot

    # ── AI Decision Output (strict JSON schema) ───────────────────────────────
    action             = Column(String(8), nullable=False)  # 'buy'|'sell'|'watch'
    confidence         = Column(Float, nullable=False)      # 0.0 – 1.0
    price_at_generation = Column(Float, nullable=True)
    price_target       = Column(Float, nullable=True)
    stop_loss          = Column(Float, nullable=True)
    time_horizon       = Column(String(32), nullable=True)  # '1-3M'|'3-6M'|'6-12M'
    risk_level         = Column(String(8), nullable=True)   # 'low'|'medium'|'high'
    reasoning          = Column(Text, nullable=True)
    key_factors        = Column(JSON, default=list)
    catalysts          = Column(JSON, default=list)
    risks              = Column(JSON, default=list)

    # ── Model metadata ─────────────────────────────────────────────────────────
    model_version      = Column(String(64), nullable=True)  # claude model used
    prompt_version     = Column(String(16), nullable=True)  # which prompt template
    pipeline_run_id    = Column(String(64), nullable=True)

    # ── Outcome tracking (filled in later) ────────────────────────────────────
    outcome_price      = Column(Float, nullable=True)   # price after time_horizon
    outcome_return_pct = Column(Float, nullable=True)   # actual return %
    outcome_correct    = Column(Boolean, nullable=True) # was action correct?
    outcome_recorded_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':              self.id,
            'symbol':          self.symbol,
            'action':          self.action,
            'confidence':      round(self.confidence * 100),
            'priceTarget':     self.price_target,
            'currentPrice':    self.price_at_generation,
            'upside':          self._upside(),
            'stopLoss':        self.stop_loss,
            'timeHorizon':     self.time_horizon,
            'riskLevel':       self.risk_level,
            'reasoning':       self.reasoning,
            'catalysts':       self.catalysts or [],
            'risks':           self.risks or [],
            'keyFactors':      self.key_factors or [],
            'generatedDate':   str(self.generated_date),
            'modelVersion':    self.model_version,
            'outcome': {
                'returnPct': self.outcome_return_pct,
                'correct':   self.outcome_correct,
            } if self.outcome_correct is not None else None,
        }

    def _upside(self):
        if self.price_target and self.price_at_generation:
            return round((self.price_target - self.price_at_generation) / self.price_at_generation * 100, 1)
        return None
