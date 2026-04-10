"""
Velocity Data Pipeline – 5 Stages:

Stage 1: collect     – Fetch raw news + price data from external sources
Stage 2: clean       – Deduplicate, normalize, remove noise
Stage 3: score       – Compute relevance score per article (filter threshold)
Stage 4: cluster     – Group similar events, produce cluster summaries
Stage 5: engineer    – Build structured feature vectors per stock per day
"""
from .collector import DataCollector
from .cleaner import DataCleaner
from .relevance_scorer import RelevanceScorer
from .clustering import NewsClusterEngine
from .feature_engineer import FeatureEngineer
from .orchestrator import PipelineOrchestrator

__all__ = [
    'DataCollector',
    'DataCleaner',
    'RelevanceScorer',
    'NewsClusterEngine',
    'FeatureEngineer',
    'PipelineOrchestrator',
]
