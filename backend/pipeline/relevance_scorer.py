"""
Stage 3 – Relevance Scorer
Scores each (cleaned) article on 4 dimensions, computes weighted total.
Only articles above RELEVANCE_THRESHOLD pass to clustering + feature engineering.
"""
import re
import logging
from typing import List

logger = logging.getLogger(__name__)

# Tracked company names → symbols
COMPANY_KEYWORDS: dict[str, str] = {
    'sap':                 'SAP',
    'siemens':             'SIE',
    'allianz':             'ALV',
    'deutsche telekom':    'DTE',
    'telekom':             'DTE',
    't-mobile':            'DTE',
    'münchener rück':      'MUV2',
    'munich re':           'MUV2',
    'infineon':            'IFX',
    'bmw':                 'BMW',
    'mercedes':            'MBG',
    'daimler':             'MBG',
    'basf':                'BAS',
    'bayer':               'BAYN',
    'volkswagen':          'VOW3',
    'vw':                  'VOW3',
    'airbus':              'AIR',
    'linde':               'LIN',
    'adidas':              'ADS',
    'rwe':                 'RWE',
    'e.on':                'EOAN',
    'eon':                 'EOAN',
    'deutsche post':       'DHL',
    'dhl':                 'DHL',
    'hannover rück':       'HNR1',
    'hannover re':         'HNR1',
    'merck':               'MRK',
    'beiersdorf':          'BEI',
    'henkel':              'HENKA',
    'vonovia':             'VNA',
    'continental':         'CON',
    'fresenius':           'FRE',
    'mtu':                 'MTX',
    'deutsche bank':       'DBK',
    'commerzbank':         'CBK',
    'porsche':             'P911',
    'daimler truck':       'DTG',
    'heidelberg materials': 'HDMG',
    'heidelbergcement':    'HDMG',
}

# High-impact financial event keywords boost impact_potential
HIGH_IMPACT_KEYWORDS = [
    'quartalszahlen', 'ergebnis', 'gewinn', 'verlust', 'umsatz', 'prognose',
    'übernahme', 'fusion', 'ipo', 'dividende', 'aktienrückkauf',
    'insolvenz', 'rückruf', 'klage', 'strafe', 'regulierung',
    'ezb', 'bundesbank', 'zinsen', 'inflation', 'rezession',
    'earnings', 'guidance', 'outlook', 'merger', 'acquisition',
    'analyst', 'kursziel', 'hochstufung', 'abstufung', 'kaufen', 'verkaufen',
]


class RelevanceScorer:
    def __init__(self, threshold: float = 0.40):
        self.threshold = threshold

    def score(self, articles: List[dict]) -> List[dict]:
        """
        Adds to each article:
          relevance_score, market_proximity, event_frequency,
          impact_potential, passes_threshold, related_symbols, sentiment_score
        """
        # Compute event_frequency across all articles first
        topic_counts = self._count_topics([a.get('cleaned_title', '') for a in articles])

        scored = []
        for article in articles:
            if article.get('is_duplicate'):
                article['passes_threshold'] = False
                scored.append(article)
                continue

            text = (article.get('cleaned_title', '') + ' ' + (article.get('cleaned_summary') or '')).lower()

            # Dimension 1: Source quality (already computed by cleaner)
            src_quality = article.get('source_quality', 0.55)

            # Dimension 2: Market proximity (how directly related to tracked companies)
            symbols_found, proximity = self._market_proximity(text)

            # Dimension 3: Event frequency (more mentions → higher relevance signal)
            freq = self._event_frequency(article.get('cleaned_title', ''), topic_counts)

            # Dimension 4: Impact potential (high-impact keywords)
            impact = self._impact_potential(text)

            # Weighted relevance score
            relevance = (
                0.30 * src_quality  +
                0.35 * proximity    +
                0.15 * freq         +
                0.20 * impact
            )

            # Sentiment
            sentiment_score, sentiment_label = self._sentiment(text)

            article.update({
                'relevance_score':  round(relevance, 3),
                'source_quality':   round(src_quality, 3),
                'market_proximity': round(proximity, 3),
                'event_frequency':  round(freq, 3),
                'impact_potential': round(impact, 3),
                'passes_threshold': relevance >= self.threshold,
                'related_symbols':  symbols_found,
                'sentiment_score':  round(sentiment_score, 3),
                'sentiment_label':  sentiment_label,
            })
            scored.append(article)

        passing = sum(1 for a in scored if a.get('passes_threshold'))
        logger.info(f'Stage 3: {passing}/{len(scored)} articles pass threshold {self.threshold}')
        return scored

    @staticmethod
    def _market_proximity(text: str):
        """How many tracked companies are mentioned → proximity 0-1."""
        found = []
        for keyword, symbol in COMPANY_KEYWORDS.items():
            if keyword in text and symbol not in found:
                found.append(symbol)

        # Also catch DAX/MDAX/TecDAX as sector mentions
        if any(x in text for x in ['dax', 'mdax', 'tecdax', 'sdax']):
            proximity = min(1.0, 0.4 + len(found) * 0.15)
        else:
            proximity = min(1.0, len(found) * 0.3) if found else 0.05

        return found, proximity

    @staticmethod
    def _count_topics(titles: List[str]) -> dict:
        """Count how often each tracked company appears across all titles."""
        counts: dict[str, int] = {}
        for title in titles:
            t = title.lower()
            for keyword in COMPANY_KEYWORDS:
                if keyword in t:
                    counts[keyword] = counts.get(keyword, 0) + 1
        return counts

    @staticmethod
    def _event_frequency(title: str, topic_counts: dict) -> float:
        """Normalize: more mentions of same topic = higher relevance signal, capped at 1."""
        t = title.lower()
        max_count = 0
        for keyword, count in topic_counts.items():
            if keyword in t:
                max_count = max(max_count, count)
        # Normalize: 1 mention = 0.2, 5+ mentions = 1.0
        return min(1.0, max_count * 0.2)

    @staticmethod
    def _impact_potential(text: str) -> float:
        """How many high-impact financial keywords appear?"""
        count = sum(1 for kw in HIGH_IMPACT_KEYWORDS if kw in text)
        return min(1.0, count * 0.15)

    @staticmethod
    def _sentiment(text: str):
        pos_words = ['steigt', 'wächst', 'rekord', 'gewinn', 'stark', 'positiv', 'erhöht',
                     'übertrifft', 'durchbruch', 'zulegt', 'profitiert', 'anhebt', 'kaufempfehlung',
                     'hochstufung', 'besser', 'solide', 'robust', 'wachstum']
        neg_words = ['fällt', 'verliert', 'verlust', 'schwach', 'negativ', 'sinkt', 'krise',
                     'klage', 'warnt', 'senkt', 'enttäuscht', 'risiko', 'abstufung', 'insolvenz',
                     'rückruf', 'strafe', 'rezession', 'sorgen', 'probleme']
        p = sum(1 for w in pos_words if w in text)
        n = sum(1 for w in neg_words if w in text)
        total = p + n
        if total == 0:
            return 0.0, 'neutral'
        score = (p - n) / total
        if score > 0.15:
            return score, 'positive'
        if score < -0.15:
            return score, 'negative'
        return score, 'neutral'
