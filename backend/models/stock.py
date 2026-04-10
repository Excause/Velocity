from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Date, DateTime, UniqueConstraint
from .base import Base


class StockPrice(Base):
    """Daily OHLCV data for a stock (source: yfinance or Finnhub)."""
    __tablename__ = 'stock_prices'
    __table_args__ = (UniqueConstraint('symbol', 'date', name='uq_symbol_date'),)

    id        = Column(Integer, primary_key=True, autoincrement=True)
    symbol    = Column(String(16), nullable=False, index=True)
    date      = Column(Date, nullable=False, index=True)
    open      = Column(Float, nullable=False)
    high      = Column(Float, nullable=False)
    low       = Column(Float, nullable=False)
    close     = Column(Float, nullable=False)
    volume    = Column(Integer, nullable=False)
    source    = Column(String(32), default='yfinance')
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'symbol': self.symbol,
            'date':   str(self.date),
            'open':   self.open,
            'high':   self.high,
            'low':    self.low,
            'close':  self.close,
            'volume': self.volume,
        }
