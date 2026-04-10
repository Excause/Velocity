"""
Velocity Backend – Central Configuration
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent

class Config:
    # ─── Database ─────────────────────────────────────────────────────────────
    # SQLite for local dev → set DATABASE_URL=postgresql://... for production
    DATABASE_URL: str = os.getenv(
        'DATABASE_URL',
        f'sqlite:///{BASE_DIR / "velocity.db"}'
    )

    # ─── API Keys ─────────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = os.getenv('ANTHROPIC_API_KEY', '')
    FINNHUB_KEY:       str = os.getenv('FINNHUB_KEY', '')
    NEWSAPI_KEY:       str = os.getenv('NEWSAPI_KEY', '')

    # ─── Claude ───────────────────────────────────────────────────────────────
    CLAUDE_MODEL:               str   = 'claude-opus-4-6'
    CLAUDE_MAX_TOKENS_DECISION: int   = 1024
    CLAUDE_MAX_TOKENS_REPORT:   int   = 768

    # ─── Pipeline thresholds ──────────────────────────────────────────────────
    # Minimum relevance score for a news article to pass to feature engineering
    RELEVANCE_THRESHOLD: float = 0.40

    # Clustering similarity threshold (cosine similarity)
    CLUSTER_SIMILARITY: float = 0.65

    # ─── Feature engineering windows ──────────────────────────────────────────
    MOMENTUM_SHORT_DAYS:  int = 5
    MOMENTUM_LONG_DAYS:   int = 20
    VOLATILITY_DAYS:      int = 20
    SENTIMENT_WINDOW_DAYS: int = 7

    # ─── Scheduler ────────────────────────────────────────────────────────────
    NIGHT_PIPELINE_HOUR:    int = 23
    NIGHT_PIPELINE_MINUTE:  int = 0
    PRE_MARKET_HOUR:        int = 8
    PRE_MARKET_MINUTE:      int = 0   # 08:00 before XETRA 09:00 open

    # ─── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'https://excause.github.io',
    ]

    # ─── German market defaults ────────────────────────────────────────────────
    DEFAULT_EXCHANGE = 'XETRA'
    MARKET_TIMEZONE  = 'Europe/Berlin'
    CURRENCY         = 'EUR'

    # Tracked DAX/MDAX symbols (Yahoo Finance .DE format used by yfinance)
    TRACKED_SYMBOLS = [
        'SAP', 'SIE', 'ALV', 'DTE', 'MUV2', 'IFX', 'BMW', 'MBG',
        'BAS', 'BAYN', 'VOW3', 'AIR', 'LIN', 'ADS', 'RWE', 'EOAN',
        'DHL', 'HNR1', 'MRK', 'BEI', 'HENKA', 'VNA', 'CON', 'FRE',
        'MTX', 'DBK', 'CBK', 'P911', 'DTG', 'HDMG',
    ]

    # Yahoo Finance suffix for German XETRA stocks
    @staticmethod
    def to_yahoo_symbol(symbol: str) -> str:
        return f'{symbol}.DE'

    # Finnhub exchange suffix
    @staticmethod
    def to_finnhub_symbol(symbol: str) -> str:
        return f'{symbol}:XETRA'


config = Config()
