"""
Stocks Blueprint – /api/stocks
"""
from flask import Blueprint, jsonify, request

stocks_bp = Blueprint('stocks', __name__, url_prefix='/api/stocks')


def _get_yf():
    try:
        import yfinance as yf
        return yf
    except ImportError:
        return None


@stocks_bp.route('/quote/<symbol>')
def get_quote(symbol):
    yf = _get_yf()
    if not yf:
        return jsonify({'error': 'yfinance not installed'}), 503

    try:
        from ..config import config
        yf_symbol = config.to_yahoo_symbol(symbol.upper())
        ticker    = yf.Ticker(yf_symbol)
        info      = ticker.fast_info
        hist      = ticker.history(period='2d', interval='1d')

        if hist.empty:
            return jsonify({'error': 'No data'}), 404

        last       = hist.iloc[-1]
        prev_close = float(hist.iloc[-2]['Close']) if len(hist) > 1 else float(info.previous_close or last['Close'])
        price      = float(last['Close'])
        change     = price - prev_close
        change_pct = (change / prev_close) * 100 if prev_close else 0

        return jsonify({
            'symbol':    symbol.upper(),
            'price':     round(price,      2),
            'change':    round(change,     2),
            'changePct': round(change_pct, 2),
            'volume':    int(last['Volume']),
            'high':      round(float(last['High']), 2),
            'low':       round(float(last['Low']),  2),
            'open':      round(float(last['Open']), 2),
            'prevClose': round(prev_close,           2),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@stocks_bp.route('/history/<symbol>')
def get_history(symbol):
    yf = _get_yf()
    if not yf:
        return jsonify({'error': 'yfinance not installed'}), 503

    range_map = {
        '1W': ('7d',  '1h'),
        '1M': ('1mo', '1d'),
        '3M': ('3mo', '1d'),
        '6M': ('6mo', '1d'),
        '1Y': ('1y',  '1d'),
    }
    range_key = request.args.get('range', '3M')
    period, interval = range_map.get(range_key, ('3mo', '1d'))

    try:
        from ..config import config
        yf_symbol = config.to_yahoo_symbol(symbol.upper())
        hist = yf.Ticker(yf_symbol).history(period=period, interval=interval)
        if hist.empty:
            return jsonify([])

        data = [
            {
                'date':   dt.strftime('%Y-%m-%d'),
                'open':   round(float(row['Open']),  2),
                'high':   round(float(row['High']),  2),
                'low':    round(float(row['Low']),   2),
                'close':  round(float(row['Close']), 2),
                'volume': int(row['Volume']),
            }
            for dt, row in hist.iterrows()
        ]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@stocks_bp.route('/search')
def search_stocks():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])

    yf = _get_yf()
    if not yf:
        return jsonify({'error': 'yfinance not installed'}), 503

    try:
        results = yf.Search(query, max_results=10)
        quotes  = results.quotes if hasattr(results, 'quotes') else []
        return jsonify([
            {
                'symbol':   q.get('symbol', ''),
                'name':     q.get('longname', q.get('shortname', '')),
                'exchange': q.get('exchange', ''),
            }
            for q in quotes
        ])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@stocks_bp.route('/batch')
def get_batch():
    """Return quotes for all tracked symbols using parallel yfinance download."""
    from ..config import config
    yf = _get_yf()
    if not yf:
        return jsonify({'error': 'yfinance not installed'}), 503

    symbols = request.args.get('symbols', '').split(',') if request.args.get('symbols') else config.TRACKED_SYMBOLS[:30]
    symbols = [s.strip().upper() for s in symbols if s.strip()]

    try:
        import pandas as pd
        # yfinance.download fetches all symbols in one HTTP request — much faster
        yf_symbols = [config.to_yahoo_symbol(s) for s in symbols]
        raw = yf.download(
            tickers=yf_symbols,
            period='2d',
            interval='1d',
            group_by='ticker',
            auto_adjust=True,
            progress=False,
            timeout=20,
        )

        results = []
        for sym, yf_sym in zip(symbols, yf_symbols):
            try:
                if len(yf_symbols) == 1:
                    df = raw
                else:
                    df = raw[yf_sym] if yf_sym in raw.columns.get_level_values(0) else pd.DataFrame()

                if df.empty or len(df) < 1:
                    continue

                price = float(df['Close'].iloc[-1])
                prev  = float(df['Close'].iloc[-2]) if len(df) >= 2 else price
                if price <= 0:
                    continue

                results.append({
                    'symbol':    sym,
                    'price':     round(price, 2),
                    'change':    round(price - prev, 2),
                    'changePct': round((price - prev) / prev * 100, 2) if prev else 0,
                    'volume':    int(df['Volume'].iloc[-1]) if 'Volume' in df.columns else 0,
                })
            except Exception:
                continue

        return jsonify(results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
