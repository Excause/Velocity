"""
Velocity – Nacht-Analyse-Skript
Läuft täglich um 23:00 Uhr, sammelt und clustert Finanzdaten.
"""
import os
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / 'data'
DATA_DIR.mkdir(exist_ok=True)


def fetch_news():
    """Fetch financial news from multiple sources."""
    news_items = []

    # NewsAPI
    newsapi_key = os.getenv('NEWSAPI_KEY')
    if newsapi_key:
        try:
            import requests
            r = requests.get(
                'https://newsapi.org/v2/top-headlines',
                params={'category': 'business', 'language': 'de', 'pageSize': 50},
                headers={'X-Api-Key': newsapi_key},
                timeout=10,
            )
            if r.ok:
                articles = r.json().get('articles', [])
                news_items.extend(articles)
                logger.info(f'Fetched {len(articles)} articles from NewsAPI')
        except Exception as e:
            logger.error(f'NewsAPI error: {e}')

    return news_items


def cluster_news(news_items):
    """Remove duplicates and cluster similar articles."""
    seen_titles = set()
    clusters = {}

    for item in news_items:
        title = item.get('title', '')
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)

        # Simple keyword clustering
        keywords = extract_keywords(title)
        clustered = False
        for cluster_key in clusters:
            if any(kw in cluster_key for kw in keywords):
                clusters[cluster_key].append(item)
                clustered = True
                break

        if not clustered:
            cluster_key = ' '.join(keywords[:2]) if keywords else title[:30]
            clusters[cluster_key] = [item]

    logger.info(f'Clustered {len(news_items)} articles into {len(clusters)} clusters')
    return clusters


def extract_keywords(text):
    """Extract financial keywords from text."""
    financial_terms = [
        'nvidia', 'apple', 'microsoft', 'tesla', 'google', 'amazon', 'meta',
        'ki', 'ai', 'aktie', 'zinsen', 'fed', 'inflation', 'bitcoin', 'krypto',
        'dividende', 'gewinn', 'verlust', 'ipo', 'merger', 'acquisition',
    ]
    text_lower = text.lower()
    return [term for term in financial_terms if term in text_lower]


def analyze_with_claude(clusters):
    """Use Claude to analyze clustered news and generate insights."""
    try:
        import anthropic
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            logger.warning('No Anthropic API key configured')
            return []

        client = anthropic.Anthropic(api_key=api_key)

        # Prepare summary of clusters
        cluster_summary = []
        for topic, articles in list(clusters.items())[:10]:
            titles = [a.get('title', '') for a in articles[:3]]
            cluster_summary.append(f"Thema '{topic}': {', '.join(titles)}")

        summary_text = '\n'.join(cluster_summary)

        prompt = f"""Analysiere diese Nachrichtencluster und erstelle Handlungsempfehlungen für Investoren:

{summary_text}

Erstelle ein JSON-Array mit Empfehlungen. Jede Empfehlung hat:
- symbol: Aktien-Ticker (z.B. "NVDA")
- action: "buy" | "sell" | "watch"
- confidence: 0-100
- reasoning: Begründung (2 Sätze, Deutsch)
- newsContext: Relevante Nachricht

Antworte NUR als JSON-Array."""

        message = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=2048,
            messages=[{'role': 'user', 'content': prompt}],
        )

        text = message.content[0].text
        import re
        json_match = re.search(r'\[[\s\S]*\]', text)
        if json_match:
            recommendations = json.loads(json_match.group())
            logger.info(f'Generated {len(recommendations)} AI recommendations')
            return recommendations

    except Exception as e:
        logger.error(f'Claude analysis error: {e}')

    return []


def save_results(news_items, recommendations):
    """Save analysis results to disk."""
    today = datetime.now().strftime('%Y-%m-%d')

    results = {
        'date': today,
        'generated_at': datetime.now().isoformat(),
        'news_count': len(news_items),
        'recommendations': recommendations,
    }

    output_file = DATA_DIR / f'analysis_{today}.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Also save as "latest"
    latest_file = DATA_DIR / 'latest_analysis.json'
    with open(latest_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    logger.info(f'Results saved to {output_file}')


def run_night_analysis():
    """Main entry point for nightly analysis."""
    logger.info('=== Velocity Nacht-Analyse gestartet ===')
    logger.info(f'Zeitpunkt: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')

    # 1. Fetch news
    news = fetch_news()
    if not news:
        logger.warning('Keine Nachrichten gefunden – Demo-Modus')
        news = [{'title': 'Demo-Nachricht', 'description': 'Keine echten Nachrichten verfügbar'}]

    # 2. Cluster
    clusters = cluster_news(news)

    # 3. AI Analysis
    recommendations = analyze_with_claude(clusters)

    # 4. Save
    save_results(news, recommendations)

    logger.info(f'=== Analyse abgeschlossen: {len(recommendations)} Empfehlungen generiert ===')
    return recommendations


if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / '.env')
    run_night_analysis()
