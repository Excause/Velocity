from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON
from .base import Base


class Portfolio(Base):
    __tablename__ = 'portfolios'

    id              = Column(Integer, primary_key=True, autoincrement=True)
    session_id      = Column(String(64), nullable=False, unique=True, index=True)
    cash            = Column(Float, default=10000.0)
    starting_capital = Column(Float, default=10000.0)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'sessionId':       self.session_id,
            'cash':            round(self.cash, 2),
            'startingCapital': self.starting_capital,
            'createdAt':       self.created_at.isoformat(),
        }


class Trade(Base):
    __tablename__ = 'trades'

    id            = Column(Integer, primary_key=True, autoincrement=True)
    session_id    = Column(String(64), nullable=False, index=True)
    symbol        = Column(String(16), nullable=False)
    trade_type    = Column(String(4), nullable=False)   # 'buy'|'sell'
    shares        = Column(Float, nullable=False)
    price         = Column(Float, nullable=False)
    total         = Column(Float, nullable=False)
    pnl           = Column(Float, nullable=True)        # set on sell
    avg_cost      = Column(Float, nullable=True)        # avg cost at time of trade
    recommendation_id = Column(Integer, nullable=True)  # link to AI recommendation
    executed_at   = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':               self.id,
            'symbol':           self.symbol,
            'type':             self.trade_type,
            'shares':           self.shares,
            'price':            self.price,
            'total':            round(self.total, 2),
            'pnl':              round(self.pnl, 2) if self.pnl is not None else None,
            'recommendationId': self.recommendation_id,
            'executedAt':       self.executed_at.isoformat(),
        }
