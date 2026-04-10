"""
Stage 2 – Data Cleaner
Deduplicates articles, normalizes text, removes noise.
"""
import re
import logging
from typing import List

logger = logging.getLogger(__name__)

# Noise phrases that indicate low-quality / irrelevant content
NOISE_PATTERNS = [
    r'\[removed\]', r'click here', r'subscribe now', r'lesen sie auch',
    r'mehr lesen', r'anzeige', r'werbung', r'cookies', r'datenschutz',
    r'\.{3,}',        # trailing ellipsis articles (truncated)
]
_noise_re = re.compile('|'.join(NOISE_PATTERNS), re.IGNORECASE)

# Known high-quality financial sources → higher base quality score
SOURCE_QUALITY_MAP = {
    'handelsblatt':       1.0,
    'faz':                1.0,
    'süddeutsche zeitung': 0.95,
    'manager magazin':    0.90,
    'börsen-zeitung':     0.95,
    'dpa-afx':            0.90,
    'reuters':            0.95,
    'bloomberg':          0.95,
    'wall street journal': 0.90,
    'finanzen.net':       0.75,
    'onvista':            0.70,
    'seeking alpha':      0.65,
    'yahoo finance':      0.70,
    'business insider':   0.70,
}


class DataCleaner:
    def __init__(self):
        self._seen_hashes: set = set()

    def clean(self, articles: List[dict]) -> List[dict]:
        """
        Process a batch of raw articles.
        Returns list with added fields: is_duplicate, cleaned_title,
        cleaned_summary, source_quality.
        """
        cleaned = []
        for article in articles:
            result = self._process(article)
            cleaned.append(result)

        dupes = sum(1 for a in cleaned if a.get('is_duplicate'))
        logger.info(f'Stage 2: {len(cleaned)} articles, {dupes} duplicates found')
        return cleaned

    def _process(self, article: dict) -> dict:
        title   = article.get('title', '') or ''
        summary = article.get('summary', '') or ''

        # ── Deduplication (exact + near-exact) ─────────────────────────────────
        fingerprint = self._fingerprint(title)
        is_dupe = fingerprint in self._seen_hashes
        if not is_dupe:
            self._seen_hashes.add(fingerprint)

        # ── Text cleaning ───────────────────────────────────────────────────────
        clean_title   = self._clean_text(title)
        clean_summary = self._clean_text(summary)

        # ── Source quality ──────────────────────────────────────────────────────
        source = (article.get('source') or '').lower()
        quality = self._source_quality(source)

        # ── Skip empty or noise-only articles ──────────────────────────────────
        if not clean_title or len(clean_title) < 15:
            is_dupe = True  # treat as discard

        return {
            **article,
            'is_duplicate':   is_dupe,
            'cleaned_title':  clean_title,
            'cleaned_summary': clean_summary,
            'source_quality': quality,
        }

    @staticmethod
    def _fingerprint(title: str) -> str:
        """Normalize title to catch near-duplicates (same story, different headline)."""
        t = title.lower().strip()
        t = re.sub(r'[^\w\s]', '', t)       # remove punctuation
        t = re.sub(r'\s+', ' ', t)           # normalize whitespace
        words = sorted(t.split())[:8]        # first 8 words, sorted (order-invariant)
        return ' '.join(words)

    @staticmethod
    def _clean_text(text: str) -> str:
        if not text:
            return ''
        text = re.sub(r'<[^>]+>', '', text)   # strip HTML
        text = re.sub(_noise_re, '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:512]  # cap length

    @staticmethod
    def _source_quality(source_name: str) -> float:
        for known, score in SOURCE_QUALITY_MAP.items():
            if known in source_name:
                return score
        return 0.55  # unknown source → below-average quality
