"""
Pipeline Blueprint – /api/pipeline
Trigger and monitor the 5-stage data pipeline.
"""
from datetime import date
from flask import Blueprint, jsonify, request

pipeline_bp = Blueprint('pipeline', __name__, url_prefix='/api/pipeline')


@pipeline_bp.route('/run', methods=['POST'])
def run_pipeline():
    """Trigger a full pipeline run (async-friendly – returns immediately with run_id)."""
    data        = request.get_json() or {}
    target_date = data.get('date')

    if target_date:
        try:
            target_date = date.fromisoformat(target_date)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    else:
        target_date = date.today()

    try:
        from ..models import SessionLocal
        from ..config import config
        from ..pipeline import PipelineOrchestrator

        db = SessionLocal()
        try:
            orchestrator = PipelineOrchestrator(db, config)
            summary      = orchestrator.run(target_date=target_date)
            return jsonify({'status': 'complete', 'summary': summary})
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pipeline_bp.route('/status')
def pipeline_status():
    """Return summary stats about the latest pipeline data in the DB."""
    try:
        from ..models import SessionLocal, NewsArticle, NewsCluster, FeatureSnapshot, Recommendation

        db = SessionLocal()
        try:
            article_count  = db.query(NewsArticle).count()
            cluster_count  = db.query(NewsCluster).count()
            snapshot_count = db.query(FeatureSnapshot).count()
            reco_count     = db.query(Recommendation).count()

            latest_snap = (
                db.query(FeatureSnapshot)
                .order_by(FeatureSnapshot.date.desc())
                .first()
            )

            return jsonify({
                'articles':      article_count,
                'clusters':      cluster_count,
                'snapshots':     snapshot_count,
                'recommendations': reco_count,
                'lastRun':       str(latest_snap.date) if latest_snap else None,
            })
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500
