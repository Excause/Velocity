from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Date, JSON, Boolean
from .base import Base


class BacktestRun(Base):
    """A complete backtesting session comparing AI strategy vs DAX benchmark."""
    __tablename__ = 'backtest_runs'

    id               = Column(Integer, primary_key=True, autoincrement=True)
    session_id       = Column(String(64), nullable=True)
    start_date       = Column(Date, nullable=False)
    end_date         = Column(Date, nullable=False)
    starting_capital = Column(Float, default=10000.0)
    risk_profile     = Column(String(16), default='moderate')

    # ── AI portfolio performance ───────────────────────────────────────────────
    ai_final_value    = Column(Float, nullable=True)
    ai_return_pct     = Column(Float, nullable=True)
    ai_max_drawdown   = Column(Float, nullable=True)   # max peak-to-trough %
    ai_hit_rate       = Column(Float, nullable=True)   # % of correct direction calls
    ai_sharpe_ratio   = Column(Float, nullable=True)
    ai_trade_count    = Column(Integer, nullable=True)

    # ── DAX benchmark performance ─────────────────────────────────────────────
    dax_final_value   = Column(Float, nullable=True)
    dax_return_pct    = Column(Float, nullable=True)
    dax_max_drawdown  = Column(Float, nullable=True)
    dax_sharpe_ratio  = Column(Float, nullable=True)

    # ── Result ────────────────────────────────────────────────────────────────
    outperforms_dax   = Column(Boolean, nullable=True)
    alpha             = Column(Float, nullable=True)   # ai_return - dax_return

    # ── Equity curve (JSON array of {date, ai_value, dax_value}) ──────────────
    equity_curve      = Column(JSON, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':            self.id,
            'startDate':     str(self.start_date),
            'endDate':       str(self.end_date),
            'startCapital':  self.starting_capital,
            'riskProfile':   self.risk_profile,
            'ai': {
                'finalValue':  self.ai_final_value,
                'returnPct':   round(self.ai_return_pct or 0, 2),
                'maxDrawdown': round(self.ai_max_drawdown or 0, 2),
                'hitRate':     round(self.ai_hit_rate or 0, 2),
                'sharpe':      round(self.ai_sharpe_ratio or 0, 2),
                'tradeCount':  self.ai_trade_count,
            },
            'dax': {
                'finalValue':  self.dax_final_value,
                'returnPct':   round(self.dax_return_pct or 0, 2),
                'maxDrawdown': round(self.dax_max_drawdown or 0, 2),
                'sharpe':      round(self.dax_sharpe_ratio or 0, 2),
            },
            'alpha':         round(self.alpha or 0, 2),
            'outperformsDax': self.outperforms_dax,
            'equityCurve':   self.equity_curve or [],
        }


class BacktestTrade(Base):
    """Individual trade within a backtest run."""
    __tablename__ = 'backtest_trades'

    id           = Column(Integer, primary_key=True, autoincrement=True)
    run_id       = Column(Integer, nullable=False, index=True)
    symbol       = Column(String(16), nullable=False)
    trade_type   = Column(String(4), nullable=False)  # 'buy'|'sell'
    date         = Column(Date, nullable=False)
    price        = Column(Float, nullable=False)
    shares       = Column(Float, nullable=False)
    total        = Column(Float, nullable=False)
    pnl          = Column(Float, nullable=True)
    signal_confidence = Column(Float, nullable=True)  # AI confidence at time of trade
    outcome_correct   = Column(Boolean, nullable=True)
