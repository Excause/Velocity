"""
Stage 4 – News Cluster Engine
Groups similar articles about the same event using TF-IDF + cosine similarity.
Produces one cluster summary per topic group → this summary (not raw articles)
is what gets passed to the feature engineer and AI.
"""
import logging
import re
from typing import List, Tuple

logger = logging.getLogger(__name__)


def _simple_tfidf(texts: List[str]) -> List[dict]:
    """
    Lightweight TF-IDF without scikit-learn dependency.
    Returns list of {word: tfidf_score} dicts.
    """
    import math

    def tokenize(text: str) -> List[str]:
        text = text.lower()
        text = re.sub(r'[^\w\s]', '', text)
        stopwords = {'die', 'der', 'das', 'und', 'in', 'von', 'mit', 'ist', 'auf',
                     'für', 'zu', 'dem', 'den', 'ein', 'eine', 'sich', 'bei', 'des',
                     'hat', 'wird', 'nach', 'an', 'aus', 'es', 'aber', 'am', 'durch'}
        return [w for w in text.split() if w not in stopwords and len(w) > 2]

    tokenized = [tokenize(t) for t in texts]
    n_docs = len(texts)

    # Document frequency
    df: dict[str, int] = {}
    for tokens in tokenized:
        for word in set(tokens):
            df[word] = df.get(word, 0) + 1

    vectors = []
    for tokens in tokenized:
        tf: dict[str, float] = {}
        for w in tokens:
            tf[w] = tf.get(w, 0) + 1
        total = len(tokens) or 1
        vec = {}
        for w, count in tf.items():
            tfidf = (count / total) * math.log(n_docs / (df.get(w, 1)))
            vec[w] = tfidf
        vectors.append(vec)
    return vectors


def _cosine_similarity(v1: dict, v2: dict) -> float:
    keys = set(v1) & set(v2)
    if not keys:
        return 0.0
    dot = sum(v1[k] * v2[k] for k in keys)
    mag1 = sum(x ** 2 for x in v1.values()) ** 0.5
    mag2 = sum(x ** 2 for x in v2.values()) ** 0.5
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


class NewsClusterEngine:
    def __init__(self, similarity_threshold: float = 0.45):
        self.threshold = similarity_threshold

    def cluster(self, articles: List[dict]) -> List[dict]:
        """
        Cluster articles that passed the relevance threshold.
        Returns list of cluster dicts, each with a representative summary.
        """
        relevant = [a for a in articles if a.get('passes_threshold')]
        if not relevant:
            logger.info('Stage 4: No relevant articles to cluster')
            return []

        texts = [
            (a.get('cleaned_title') or '') + ' ' + (a.get('cleaned_summary') or '')
            for a in relevant
        ]

        try:
            vectors = _simple_tfidf(texts)
        except Exception as e:
            logger.error(f'TF-IDF failed: {e}, falling back to title-only groups')
            vectors = [{}] * len(texts)

        clusters = self._greedy_cluster(relevant, vectors)
        logger.info(f'Stage 4: {len(relevant)} articles → {len(clusters)} clusters')
        return clusters

    def _greedy_cluster(self, articles: List[dict], vectors: List[dict]) -> List[dict]:
        """
        Greedy clustering: each article joins the first cluster it's similar to,
        or starts a new one.
        """
        assignments: List[int] = [-1] * len(articles)
        cluster_centers: List[dict] = []
        n_clusters = 0

        for i, (article, vec) in enumerate(zip(articles, vectors)):
            best_cluster, best_sim = -1, 0.0
            for c_idx, center in enumerate(cluster_centers):
                sim = _cosine_similarity(vec, center)
                if sim > best_sim:
                    best_sim, best_cluster = sim, c_idx
            if best_sim >= self.threshold:
                assignments[i] = best_cluster
            else:
                assignments[i] = n_clusters
                cluster_centers.append(vec)
                n_clusters += 1

        # Build cluster objects
        groups: dict[int, List[dict]] = {}
        for idx, c_id in enumerate(assignments):
            groups.setdefault(c_id, []).append(articles[idx])

        result = []
        for c_id, members in groups.items():
            result.append(self._build_cluster(c_id, members))
        return result

    @staticmethod
    def _build_cluster(cluster_id: int, members: List[dict]) -> dict:
        """
        Build a cluster summary.
        The representative_summary is a single, compact text that captures
        the essence of all articles in the group.
        """
        # Collect all symbols mentioned
        symbols: set = set()
        for m in members:
            for s in (m.get('related_symbols') or []):
                symbols.add(s)

        # Aggregate sentiment
        scores = [m.get('sentiment_score', 0) for m in members if m.get('sentiment_score') is not None]
        avg_sentiment = sum(scores) / len(scores) if scores else 0.0

        # Pick the article with the highest relevance score as representative
        rep = max(members, key=lambda a: a.get('relevance_score') or 0)
        rep_text = rep.get('cleaned_title', '')
        if rep.get('cleaned_summary'):
            rep_text += ': ' + rep['cleaned_summary'][:200]

        # Build topic label from top symbols or first keywords of representative title
        if symbols:
            topic = ', '.join(sorted(symbols)[:3])
        else:
            words = rep.get('cleaned_title', 'Allgemein').split()[:4]
            topic = ' '.join(words)

        max_impact = max((m.get('impact_potential', 0) for m in members), default=0.0)

        return {
            'cluster_id':              cluster_id,
            'topic_label':             topic,
            'article_count':           len(members),
            'symbols':                 list(symbols),
            'sentiment_avg':           round(avg_sentiment, 3),
            'impact_max':              round(max_impact, 3),
            'representative_summary':  rep_text[:512],
            'article_titles':          [m.get('cleaned_title', '') for m in members],
            '_members':                members,  # kept for feature engineering
        }
