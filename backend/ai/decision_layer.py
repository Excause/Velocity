"""
AI Decision Layer
=================
Receives ONLY structured FeatureSnapshot dicts (no raw news, no raw prices).
Sends a compact, token-efficient prompt to Claude and validates/parses the response
into a strict output schema before returning.

Input schema:  FeatureSnapshot.to_ai_input()
Output schema: DecisionOutput (dataclass)
"""
import json
import logging
import re
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# ── Output schema ─────────────────────────────────────────────────────────────

@dataclass
class DecisionOutput:
    symbol:        str
    action:        str             # 'buy' | 'sell' | 'watch'
    confidence:    float           # 0.0–1.0
    price_target:  Optional[float]
    stop_loss:     Optional[float]
    time_horizon:  str             # '1-3M' | '3-6M' | '6-12M'
    risk_level:    str             # 'low' | 'medium' | 'high'
    reasoning:     str
    catalysts:     list = field(default_factory=list)
    risks:         list = field(default_factory=list)
    key_factors:   list = field(default_factory=list)
    model_version: str  = ''
    prompt_version: str = 'v1'
    raw_response:  str  = ''

    def to_dict(self) -> dict:
        return {
            'symbol':       self.symbol,
            'action':       self.action,
            'confidence':   round(self.confidence * 100),
            'priceTarget':  self.price_target,
            'stopLoss':     self.stop_loss,
            'timeHorizon':  self.time_horizon,
            'riskLevel':    self.risk_level,
            'reasoning':    self.reasoning,
            'catalysts':    self.catalysts,
            'risks':        self.risks,
            'keyFactors':   self.key_factors,
            'modelVersion': self.model_version,
        }


# ── Prompt template ───────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are a quantitative investment analyst specializing in German XETRA stocks (DAX/MDAX).
You receive structured feature vectors — never raw news or prices.
Respond ONLY with a valid JSON object matching the exact schema provided. No markdown, no explanation outside JSON."""

_USER_PROMPT_TEMPLATE = """Analyze this stock based on the structured feature snapshot and return a JSON investment decision.

FEATURE SNAPSHOT:
{feature_json}

REQUIRED JSON SCHEMA:
{{
  "action":       "buy" | "sell" | "watch",
  "confidence":   <float 0.0–1.0>,
  "price_target": <float EUR, or null>,
  "stop_loss":    <float EUR, or null>,
  "time_horizon": "1-3M" | "3-6M" | "6-12M",
  "risk_level":   "low" | "medium" | "high",
  "reasoning":    "<2-3 sentence German explanation>",
  "catalysts":    ["<catalyst 1>", "<catalyst 2>", "<catalyst 3>"],
  "risks":        ["<risk 1>", "<risk 2>", "<risk 3>"],
  "key_factors":  ["<factor 1>", "<factor 2>"]
}}

Rules:
- confidence must reflect signal strength (0.0 = no signal, 1.0 = very strong)
- price_target and stop_loss must be realistic relative to current price
- reasoning must be in German and reference specific features
- return ONLY the JSON object"""


# ── Decision Layer class ──────────────────────────────────────────────────────

class DecisionLayer:
    """
    Wraps the Claude API call for investment decisions.
    Only accepts structured feature dicts, never raw data.
    """

    def __init__(self, config):
        self.config = config
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import anthropic
            self._client = anthropic.Anthropic(api_key=self.config.ANTHROPIC_API_KEY)
        return self._client

    def decide(self, feature_snapshot: dict) -> DecisionOutput:
        """
        Core method: takes a FeatureSnapshot.to_ai_input() dict and returns DecisionOutput.
        Raises ValueError if the snapshot is missing required fields.
        """
        self._validate_input(feature_snapshot)
        symbol = feature_snapshot['symbol']

        # Build prompt – keep it compact to minimise tokens
        feature_json = json.dumps(feature_snapshot, indent=2)
        user_prompt  = _USER_PROMPT_TEMPLATE.format(feature_json=feature_json)

        try:
            message = self.client.messages.create(
                model=self.config.CLAUDE_MODEL,
                max_tokens=self.config.CLAUDE_MAX_TOKENS_DECISION,
                system=_SYSTEM_PROMPT,
                messages=[{'role': 'user', 'content': user_prompt}],
            )
            raw_text     = message.content[0].text
            model_version = message.model
        except Exception as e:
            logger.error(f'Claude API error for {symbol}: {e}')
            raise

        output = self._parse_response(raw_text, symbol, model_version)
        logger.info(
            f'Decision for {symbol}: {output.action.upper()} '
            f'conf={output.confidence:.0%} risk={output.risk_level}'
        )
        return output

    def decide_batch(self, snapshots: list) -> list:
        """Run decide() for multiple snapshots; skip and log errors."""
        results = []
        for snap in snapshots:
            try:
                results.append(self.decide(snap))
            except Exception as e:
                logger.warning(f"Skipping {snap.get('symbol', '?')}: {e}")
        return results

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _validate_input(snap: dict):
        required = ('symbol', 'price')
        missing  = [k for k in required if k not in snap]
        if missing:
            raise ValueError(f'FeatureSnapshot missing required fields: {missing}')

    @staticmethod
    def _parse_response(raw: str, symbol: str, model_version: str) -> DecisionOutput:
        """Extract and validate JSON from Claude response."""
        # Strip markdown code fences if present
        text = re.sub(r'```(?:json)?\s*', '', raw).strip()
        json_match = re.search(r'\{[\s\S]*\}', text)
        if not json_match:
            raise ValueError(f'No JSON object found in response for {symbol}')

        try:
            data = json.loads(json_match.group())
        except json.JSONDecodeError as e:
            raise ValueError(f'Invalid JSON for {symbol}: {e}')

        # Normalise and validate fields
        action = str(data.get('action', 'watch')).lower()
        if action not in ('buy', 'sell', 'watch'):
            action = 'watch'

        confidence = float(data.get('confidence', 0.5))
        confidence = max(0.0, min(1.0, confidence))

        risk_level = str(data.get('risk_level', 'medium')).lower()
        if risk_level not in ('low', 'medium', 'high'):
            risk_level = 'medium'

        time_horizon = str(data.get('time_horizon', '3-6M'))
        if time_horizon not in ('1-3M', '3-6M', '6-12M'):
            time_horizon = '3-6M'

        price_target = data.get('price_target')
        if price_target is not None:
            try:
                price_target = float(price_target)
            except (TypeError, ValueError):
                price_target = None

        stop_loss = data.get('stop_loss')
        if stop_loss is not None:
            try:
                stop_loss = float(stop_loss)
            except (TypeError, ValueError):
                stop_loss = None

        return DecisionOutput(
            symbol        = symbol,
            action        = action,
            confidence    = confidence,
            price_target  = price_target,
            stop_loss     = stop_loss,
            time_horizon  = time_horizon,
            risk_level    = risk_level,
            reasoning     = str(data.get('reasoning', '')),
            catalysts     = list(data.get('catalysts', [])),
            risks         = list(data.get('risks', [])),
            key_factors   = list(data.get('key_factors', [])),
            model_version = model_version,
            raw_response  = raw,
        )
