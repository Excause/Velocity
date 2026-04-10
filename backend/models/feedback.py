from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Text
from .base import Base


class Feedback(Base):
    """
    User feedback on a recommendation.
    Used for continuous quality improvement – fed back into future
    feature engineering and prompt calibration.
    """
    __tablename__ = 'feedback'

    id                = Column(Integer, primary_key=True, autoincrement=True)
    recommendation_id = Column(Integer, nullable=False, index=True)
    session_id        = Column(String(64), nullable=True)
    rating            = Column(String(16), nullable=False)   # 'good'|'neutral'|'bad'
    rating_numeric    = Column(Float, nullable=True)         # +1 / 0 / -1 for scoring
    comment           = Column(Text, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)

    RATING_MAP = {'good': 1.0, 'neutral': 0.0, 'bad': -1.0}

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.rating_numeric = self.RATING_MAP.get(self.rating, 0.0)

    def to_dict(self):
        return {
            'id':               self.id,
            'recommendationId': self.recommendation_id,
            'rating':           self.rating,
            'comment':          self.comment,
            'createdAt':        self.created_at.isoformat(),
        }
