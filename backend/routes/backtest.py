"""
Backtest Blueprint – /api/backtest
"""
from datetime import date, timedelta
from flask import Blueprint, jsonify, request

backtest_bp = Blueprint('backtest', __name__, url_prefix='/api/backtest')


@backtest_bp.route('/run', methods=['POST'])
def run_backtest():
    data = request.get_json() or {}

    try:
        start_date = date.fromisoformat(data.get('startDate', str(date.today() - timedelta(days=365))))
        end_date   = date.fromisoformat(data.get('endDate',   str(date.today())))
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if start_date >= end_date:
        return jsonify({'error': 'startDate must be before endDate'}), 400

    starting_capital = float(data.get('startingCapital', 10_000))
    risk_profile     = data.get('riskProfile', 'moderate')
    symbols          = data.get('symbols')  # None → use config defaults

    try:
        from ..models  import SessionLocal
        from ..config  import config
        from ..backtesting import BacktestEngine

        db = SessionLocal()
        try:
            engine = BacktestEngine(db, config)
            result = engine.run(
                start_date       = start_date,
                end_date         = end_date,
                starting_capital = starting_capital,
                risk_profile     = risk_profile,
                symbols          = symbols,
            )
            return jsonify(result)
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@backtest_bp.route('/history')
def backtest_history():
    """Return list of past backtest runs."""
    limit = min(int(request.args.get('limit', 10)), 50)

    try:
        from ..models import SessionLocal, BacktestRun
        db = SessionLocal()
        try:
            runs = (
                db.query(BacktestRun)
                .order_by(BacktestRun.created_at.desc())
                .limit(limit)
                .all()
            )
            return jsonify([r.to_dict() for r in runs])
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@backtest_bp.route('/<int:run_id>/trades')
def backtest_trades(run_id: int):
    """Return individual trades for a backtest run."""
    try:
        from ..models import SessionLocal, BacktestTrade
        db = SessionLocal()
        try:
            trades = (
                db.query(BacktestTrade)
                .filter_by(run_id=run_id)
                .order_by(BacktestTrade.date)
                .all()
            )
            return jsonify([
                {
                    'id':         t.id,
                    'symbol':     t.symbol,
                    'type':       t.trade_type,
                    'date':       str(t.date),
                    'price':      t.price,
                    'shares':     round(t.shares, 4),
                    'total':      round(t.total, 2),
                    'pnl':        round(t.pnl, 2) if t.pnl is not None else None,
                    'confidence': round(t.signal_confidence * 100) if t.signal_confidence else None,
                }
                for t in trades
            ])
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500
