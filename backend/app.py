"""
Velocity Backend – Central Entry Point
Run: python -m backend.app   (from repo root)
 or: python app.py           (from backend/)
"""
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s – %(message)s',
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, origins=[
        'http://localhost:3000',
        'http://localhost:5173',
        'https://excause.github.io',
    ])

    # ── Register Blueprints ────────────────────────────────────────────────────
    from .routes import stocks_bp, news_bp, ai_bp, pipeline_bp, backtest_bp

    app.register_blueprint(stocks_bp)
    app.register_blueprint(news_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(pipeline_bp)
    app.register_blueprint(backtest_bp)

    # ── Health check ───────────────────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        try:
            import yfinance  # noqa: F401
            yf_ok = True
        except ImportError:
            yf_ok = False

        return jsonify({
            'status':   'ok',
            'version':  '2.0.0',
            'services': {
                'yfinance':  yf_ok,
                'anthropic': bool(os.getenv('ANTHROPIC_API_KEY')),
                'newsapi':   bool(os.getenv('NEWSAPI_KEY')),
                'finnhub':   bool(os.getenv('FINNHUB_KEY')),
            },
        })

    # ── Ensure DB tables exist ─────────────────────────────────────────────────
    try:
        from .models import Base, engine
        Base.metadata.create_all(bind=engine)
        logger.info('Database tables verified/created')
    except Exception as e:
        logger.warning(f'DB init skipped: {e}')

    # ── Background scheduler ───────────────────────────────────────────────────
    _setup_scheduler(app)

    return app


def _setup_scheduler(app: Flask):
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from .config import config

        scheduler = BackgroundScheduler()

        def _night_pipeline():
            with app.app_context():
                try:
                    from .models    import SessionLocal
                    from .pipeline  import PipelineOrchestrator
                    db   = SessionLocal()
                    orch = PipelineOrchestrator(db, config)
                    summary = orch.run()
                    db.close()
                    logger.info(f'Night pipeline complete: {summary}')
                except Exception as e:
                    logger.error(f'Night pipeline error: {e}')

        def _morning_decisions():
            with app.app_context():
                try:
                    from .models import SessionLocal, FeatureSnapshot, Recommendation
                    from .ai     import DecisionLayer
                    from datetime import date

                    db      = SessionLocal()
                    layer   = DecisionLayer(config)
                    today   = date.today()

                    snaps = (
                        db.query(FeatureSnapshot)
                        .filter(FeatureSnapshot.date == today)
                        .all()
                    )
                    for snap in snaps:
                        try:
                            feat = snap.to_ai_input()
                            out  = layer.decide(feat)
                            db.add(Recommendation(
                                symbol              = out.symbol,
                                generated_date      = today,
                                feature_snapshot_id = snap.id,
                                action              = out.action,
                                confidence          = out.confidence,
                                price_at_generation = feat['price']['current'],
                                price_target        = out.price_target,
                                stop_loss           = out.stop_loss,
                                time_horizon        = out.time_horizon,
                                risk_level          = out.risk_level,
                                reasoning           = out.reasoning,
                                catalysts           = out.catalysts,
                                risks               = out.risks,
                                key_factors         = out.key_factors,
                                model_version       = out.model_version,
                                prompt_version      = out.prompt_version,
                            ))
                        except Exception as e:
                            logger.warning(f'Decision failed for {snap.symbol}: {e}')
                    db.commit()
                    db.close()
                    logger.info(f'Morning decisions generated for {len(snaps)} symbols')
                except Exception as e:
                    logger.error(f'Morning decisions error: {e}')

        scheduler.add_job(_night_pipeline,    'cron', hour=config.NIGHT_PIPELINE_HOUR,
                          minute=config.NIGHT_PIPELINE_MINUTE)
        scheduler.add_job(_morning_decisions, 'cron', hour=config.PRE_MARKET_HOUR,
                          minute=config.PRE_MARKET_MINUTE)
        scheduler.start()
        logger.info('Background scheduler started (night pipeline + morning decisions)')
        return scheduler

    except ImportError:
        logger.warning('APScheduler not installed – scheduler disabled')
        return None


# ── Standalone entry point ─────────────────────────────────────────────────────
app = create_app()

if __name__ == '__main__':
    print('\n  Velocity Backend v2.0')
    print('  → http://localhost:5000')
    print('  → Health: http://localhost:5000/api/health\n')
    app.run(debug=True, port=5000, host='0.0.0.0')
