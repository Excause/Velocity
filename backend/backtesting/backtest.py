"""
Backtesting Engine
==================
Replays historical AI recommendations against real OHLCV data and computes
performance metrics vs. the DAX benchmark.

Strategy:
  - On each trading day, check if an AI recommendation exists for a symbol.
  - BUY signal  → buy at next-day open, hold for `hold_days` or until SELL signal.
  - SELL signal → close any open position at next-day open.
  - Position sizing: equal-weight across active positions (max `max_positions`).
  - Compare equity curve against buying and holding ^GDAXI (DAX index).
"""
import logging
import math
import uuid
from datetime import date, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
DAX_YAHOO = '^GDAXI'
HOLD_DAYS = 20          # default hold period when no exit signal
MAX_POSITIONS = 5       # max concurrent positions
COMMISSION = 0.001      # 0.1% per trade (one-way)


# ── BacktestEngine ────────────────────────────────────────────────────────────

class BacktestEngine:
    """
    Runs a full backtest given historical price data and AI recommendations.
    Persists a BacktestRun + BacktestTrade rows to the database.
    """

    def __init__(self, db_session, config):
        self.db     = db_session
        self.config = config

    def run(
        self,
        start_date:       date,
        end_date:         date,
        starting_capital: float = 10_000.0,
        risk_profile:     str   = 'moderate',
        symbols:          Optional[list] = None,
    ) -> dict:
        """
        Execute backtesting and return a result dict matching BacktestRun.to_dict().
        """
        session_id = str(uuid.uuid4())[:8]
        if symbols is None:
            symbols = self.config.TRACKED_SYMBOLS[:15]

        logger.info(f'Backtest {session_id}: {start_date} → {end_date}, capital={starting_capital}')

        # ── 1. Load price data ─────────────────────────────────────────────────
        prices   = self._load_prices(symbols, start_date, end_date)
        dax_data = self._load_dax(start_date, end_date)

        if not prices and not dax_data:
            raise ValueError('No price data available for the requested period')

        # ── 2. Load AI recommendations ─────────────────────────────────────────
        recommendations = self._load_recommendations(symbols, start_date, end_date)

        # ── 3. Simulate AI portfolio ───────────────────────────────────────────
        ai_result   = self._simulate_portfolio(
            prices, recommendations, starting_capital, start_date, end_date
        )

        # ── 4. Simulate DAX buy-and-hold ───────────────────────────────────────
        dax_result = self._simulate_dax(dax_data, starting_capital)

        # ── 5. Compute metrics ─────────────────────────────────────────────────
        ai_metrics  = self._compute_metrics(ai_result['equity_curve'],  starting_capital)
        dax_metrics = self._compute_metrics(dax_result['equity_curve'], starting_capital)

        alpha = ai_metrics['return_pct'] - dax_metrics['return_pct']

        # ── 6. Build equity curve (merged) ─────────────────────────────────────
        equity_curve = self._merge_curves(ai_result['equity_curve'], dax_result['equity_curve'])

        # ── 7. Persist to DB ───────────────────────────────────────────────────
        run = self._persist_run(
            session_id, start_date, end_date, starting_capital, risk_profile,
            ai_metrics, dax_metrics, alpha, equity_curve
        )
        self._persist_trades(run.id, ai_result['trades'])

        result = run.to_dict()
        logger.info(
            f'Backtest {session_id} complete: '
            f'AI={ai_metrics["return_pct"]:.1f}% DAX={dax_metrics["return_pct"]:.1f}% '
            f'alpha={alpha:.1f}%'
        )
        return result

    # ── Portfolio simulation ──────────────────────────────────────────────────

    def _simulate_portfolio(
        self, prices: dict, recommendations: list,
        capital: float, start: date, end: date
    ) -> dict:
        """Equal-weight portfolio rebalanced on AI signals."""
        cash      = capital
        positions = {}   # symbol → {shares, buy_price, buy_date}
        equity    = []
        trades    = []

        reco_map = {}    # date → [reco_dict]
        for r in recommendations:
            d = r['date']
            reco_map.setdefault(d, []).append(r)

        trading_days = sorted(set(
            d for sym_data in prices.values()
            for d in sym_data.keys()
        ))

        for day in trading_days:
            if day < start or day > end:
                continue

            day_recos = reco_map.get(day, [])

            # ── Process signals ────────────────────────────────────────────────
            for reco in day_recos:
                sym    = reco['symbol']
                action = reco['action']

                if action == 'sell' and sym in positions:
                    price = self._get_price(prices, sym, day, 'open')
                    if price:
                        pos   = positions.pop(sym)
                        gross = pos['shares'] * price
                        fee   = gross * COMMISSION
                        pnl   = gross - fee - pos['cost']
                        cash += gross - fee
                        trades.append({
                            'symbol': sym, 'type': 'sell', 'date': day,
                            'price': price, 'shares': pos['shares'],
                            'total': gross, 'pnl': round(pnl, 2),
                            'confidence': reco.get('confidence', 0.5),
                        })

                elif action == 'buy' and sym not in positions:
                    if len(positions) >= MAX_POSITIONS:
                        continue
                    price = self._get_price(prices, sym, day, 'open')
                    if not price:
                        continue
                    # Equal-weight sizing
                    slot_value = cash / (MAX_POSITIONS - len(positions))
                    invest     = min(slot_value, cash * 0.95)
                    shares     = (invest * (1 - COMMISSION)) / price
                    cost       = shares * price * (1 + COMMISSION)
                    if cost > cash or shares < 0.01:
                        continue
                    cash -= cost
                    positions[sym] = {
                        'shares': shares, 'buy_price': price,
                        'cost': cost, 'buy_date': day,
                    }
                    trades.append({
                        'symbol': sym, 'type': 'buy', 'date': day,
                        'price': price, 'shares': shares,
                        'total': cost, 'pnl': None,
                        'confidence': reco.get('confidence', 0.5),
                    })

            # ── Auto-close positions past hold period ──────────────────────────
            to_close = []
            for sym, pos in positions.items():
                age = (day - pos['buy_date']).days
                if age >= HOLD_DAYS:
                    to_close.append(sym)
            for sym in to_close:
                price = self._get_price(prices, sym, day, 'close')
                if price:
                    pos   = positions.pop(sym)
                    gross = pos['shares'] * price
                    fee   = gross * COMMISSION
                    pnl   = gross - fee - pos['cost']
                    cash += gross - fee
                    trades.append({
                        'symbol': sym, 'type': 'sell', 'date': day,
                        'price': price, 'shares': pos['shares'],
                        'total': gross, 'pnl': round(pnl, 2),
                        'confidence': None,
                    })

            # ── Mark-to-market ─────────────────────────────────────────────────
            position_value = sum(
                pos['shares'] * (self._get_price(prices, sym, day, 'close') or pos['buy_price'])
                for sym, pos in positions.items()
            )
            total_value = cash + position_value
            equity.append({'date': str(day), 'value': round(total_value, 2)})

        return {'equity_curve': equity, 'trades': trades}

    def _simulate_dax(self, dax_data: dict, capital: float) -> dict:
        """Simple buy-and-hold on DAX from first available day."""
        if not dax_data:
            return {'equity_curve': []}

        dates  = sorted(dax_data.keys())
        first  = dax_data[dates[0]]['close']
        equity = []

        for d in dates:
            close = dax_data[d]['close']
            value = capital * (close / first) if first else capital
            equity.append({'date': str(d), 'value': round(value, 2)})

        return {'equity_curve': equity}

    # ── Data loading ──────────────────────────────────────────────────────────

    def _load_prices(self, symbols: list, start: date, end: date) -> dict:
        """Load OHLCV from DB and fall back to yfinance if needed."""
        from ..models import StockPrice
        result = {}

        db_rows = (
            self.db.query(StockPrice)
            .filter(StockPrice.symbol.in_(symbols))
            .filter(StockPrice.date >= start)
            .filter(StockPrice.date <= end)
            .all()
        )

        for row in db_rows:
            result.setdefault(row.symbol, {})[row.date] = {
                'open': row.open, 'high': row.high,
                'low': row.low,   'close': row.close,
                'volume': row.volume,
            }

        # Fill gaps with yfinance for symbols not in DB
        missing = [s for s in symbols if s not in result]
        if missing:
            result.update(self._fetch_prices_yfinance(missing, start, end))

        return result

    def _fetch_prices_yfinance(self, symbols: list, start: date, end: date) -> dict:
        try:
            import yfinance as yf
            result = {}
            yf_symbols = [self.config.to_yahoo_symbol(s) for s in symbols]
            data = yf.download(
                yf_symbols, start=start, end=end + timedelta(days=1),
                auto_adjust=True, progress=False, threads=True,
            )
            if data.empty:
                return {}

            for sym, yf_sym in zip(symbols, yf_symbols):
                sym_data = {}
                for dt, row in data.iterrows():
                    d = dt.date()
                    try:
                        close = float(row[('Close', yf_sym)])
                        if math.isnan(close):
                            continue
                        sym_data[d] = {
                            'open':   float(row[('Open',   yf_sym)]),
                            'high':   float(row[('High',   yf_sym)]),
                            'low':    float(row[('Low',    yf_sym)]),
                            'close':  close,
                            'volume': int(row[('Volume', yf_sym)]),
                        }
                    except (KeyError, ValueError):
                        continue
                if sym_data:
                    result[sym] = sym_data
            return result
        except Exception as e:
            logger.warning(f'yfinance fetch failed: {e}')
            return {}

    def _load_dax(self, start: date, end: date) -> dict:
        """Load DAX ^GDAXI price data via yfinance."""
        try:
            import yfinance as yf
            data = yf.download(
                DAX_YAHOO, start=start, end=end + timedelta(days=1),
                auto_adjust=True, progress=False,
            )
            if data.empty:
                return {}
            result = {}
            for dt, row in data.iterrows():
                d = dt.date()
                try:
                    close = float(row['Close'])
                    if not math.isnan(close):
                        result[d] = {'open': float(row['Open']), 'close': close}
                except (KeyError, ValueError):
                    continue
            return result
        except Exception as e:
            logger.warning(f'DAX data fetch failed: {e}')
            return {}

    def _load_recommendations(self, symbols: list, start: date, end: date) -> list:
        """Load AI recommendations from DB for the given period."""
        from ..models import Recommendation
        rows = (
            self.db.query(Recommendation)
            .filter(Recommendation.symbol.in_(symbols))
            .filter(Recommendation.generated_date >= start)
            .filter(Recommendation.generated_date <= end)
            .all()
        )
        return [
            {
                'symbol':     r.symbol,
                'date':       r.generated_date,
                'action':     r.action,
                'confidence': r.confidence,
            }
            for r in rows
        ]

    # ── Metrics ───────────────────────────────────────────────────────────────

    @staticmethod
    def _compute_metrics(equity_curve: list, starting_capital: float) -> dict:
        if not equity_curve:
            return {
                'return_pct': 0.0, 'final_value': starting_capital,
                'max_drawdown': 0.0, 'sharpe': 0.0,
            }

        values    = [p['value'] for p in equity_curve]
        final     = values[-1]
        return_pct = (final - starting_capital) / starting_capital * 100

        # Max drawdown
        peak = values[0]
        max_dd = 0.0
        for v in values:
            if v > peak:
                peak = v
            dd = (peak - v) / peak * 100
            if dd > max_dd:
                max_dd = dd

        # Daily returns for Sharpe (annualised, assume 252 trading days)
        daily_rets = []
        for i in range(1, len(values)):
            if values[i - 1] > 0:
                daily_rets.append((values[i] - values[i - 1]) / values[i - 1])

        if len(daily_rets) > 1:
            import statistics
            mean_r  = statistics.mean(daily_rets)
            std_r   = statistics.stdev(daily_rets)
            sharpe  = (mean_r / std_r * math.sqrt(252)) if std_r > 0 else 0.0
        else:
            sharpe = 0.0

        return {
            'return_pct':   round(return_pct, 2),
            'final_value':  round(final, 2),
            'max_drawdown': round(max_dd, 2),
            'sharpe':       round(sharpe, 2),
        }

    @staticmethod
    def _merge_curves(ai_curve: list, dax_curve: list) -> list:
        ai_map  = {p['date']: p['value'] for p in ai_curve}
        dax_map = {p['date']: p['value'] for p in dax_curve}
        all_dates = sorted(set(ai_map) | set(dax_map))
        merged = []
        for d in all_dates:
            entry = {'date': d}
            if d in ai_map:
                entry['aiValue'] = ai_map[d]
            if d in dax_map:
                entry['daxValue'] = dax_map[d]
            merged.append(entry)
        return merged

    # ── Persistence ───────────────────────────────────────────────────────────

    def _persist_run(
        self, session_id, start, end, capital, risk_profile,
        ai_m, dax_m, alpha, equity_curve
    ):
        from ..models import BacktestRun
        run = BacktestRun(
            session_id       = session_id,
            start_date       = start,
            end_date         = end,
            starting_capital = capital,
            risk_profile     = risk_profile,
            ai_final_value   = ai_m['final_value'],
            ai_return_pct    = ai_m['return_pct'],
            ai_max_drawdown  = ai_m['max_drawdown'],
            ai_sharpe_ratio  = ai_m['sharpe'],
            dax_final_value  = dax_m['final_value'],
            dax_return_pct   = dax_m['return_pct'],
            dax_max_drawdown = dax_m['max_drawdown'],
            dax_sharpe_ratio = dax_m['sharpe'],
            outperforms_dax  = ai_m['return_pct'] > dax_m['return_pct'],
            alpha            = alpha,
            equity_curve     = equity_curve,
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def _persist_trades(self, run_id: int, trades: list):
        from ..models import BacktestTrade
        for t in trades:
            self.db.add(BacktestTrade(
                run_id            = run_id,
                symbol            = t['symbol'],
                trade_type        = t['type'],
                date              = t['date'],
                price             = t['price'],
                shares            = t['shares'],
                total             = t['total'],
                pnl               = t.get('pnl'),
                signal_confidence = t.get('confidence'),
            ))
        self.db.commit()

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _get_price(prices: dict, symbol: str, day: date, field: str) -> Optional[float]:
        sym_data = prices.get(symbol, {})
        row = sym_data.get(day)
        if row:
            return row.get(field)
        # Try nearest previous day (max 5 days back)
        for i in range(1, 6):
            prev = day - timedelta(days=i)
            row  = sym_data.get(prev)
            if row:
                return row.get(field)
        return None
