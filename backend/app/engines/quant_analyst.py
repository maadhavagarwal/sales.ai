from app.engines.llm_engine import ask_llm
from app.engines.market_dynamics_engine import MarketDynamicsEngine
import pandas as pd

def run_quant_analysis(df, analytics, market_data):
    """
    Executes a high-fidelity Quantitative Audit of market data.
    Synthesizes Technical Indicators, Greeks, and Sentiment into a Strategic Brief.
    """
    
    # 1. Indicator Context
    indicators = market_data.get("indicators", pd.DataFrame())
    pcr = market_data.get("pcr", {})
    
    # 2. Extract Sentiment
    pcr_val = pcr.get("pcr_oi", "N/A")
    sentiment = pcr.get("sentiment", "Neutral")
    
    latest_rsi = "N/A"
    if not indicators.empty and "rsi" in indicators.columns:
        latest_rsi = round(indicators["rsi"].iloc[-1], 2)
        
    # 3. LLM Prompting for Trading Strategy
    context = f"""
You are the Lead Quantitative Strategist and CDO.
Analyze the following Market Intelligence vectors and provide a high-conviction Trading Strategy Brief.

MARKET METRICS:
- Put-Call Ratio (PCR): {pcr_val}
- Aggregate Sentiment: {sentiment}
- Core Technicals: RSI at {latest_rsi}
- Data Volume: {len(df)} ticks analyzed.

ANALYTICAL VECTORS:
{analytics}

Task: Write a 3-paragraph Quantitative Brief.
Paragraph 1: Market Physics (Analyze technical indicators and price boundaries like Bollinger Bands).
Paragraph 2: Sentiment & Options Flow (Interpret PCR and Open Interest buildup).
Paragraph 3: Strategic Directive (Provide high-conviction action: Hedge, Accumulate, or Liquidate).

Focus on 'Alpha Generation' and 'Capital Protection'. Use markdown bolding for key strike zones or indicator levels.
"""

    try:
        report = ask_llm(context)
        if "unavailable" in report.lower() or "ollama" in report.lower():
            report = _generate_fallback_quant_report(indicators, pcr, analytics)
    except Exception:
        report = _generate_fallback_quant_report(indicators, pcr, analytics)

    return {
        "report": report,
        "sentiment": sentiment,
        "pcr": pcr_val
    }

def _generate_fallback_quant_report(indicators, pcr, analytics):
    """Rule-based heuristic fallback for Trading Intelligence."""
    
    rep = "### 📈 Quantitative Strategy Brief (Heuristic Mode)\n\n"
    
    # 1. Technical Boundary Analysis
    rep += "### 1. Market Physics & Volatility Boundaries\n"
    if not indicators.empty and "rsi" in indicators.columns:
        rsi = indicators["rsi"].iloc[-1]
        rep += f"The current **RSI is indexed at {rsi:.2f}**. "
        if rsi > 70: rep += "The market has entered a 'Hyper-Extended' zone, suggesting imminent resistance and exhaustion. "
        elif rsi < 30: rep += "The asset is currently 'Oversold', indicating a significant probability of a mean-reversion bounce. "
        else: rep += "The momentum remains established within the median quadrant, supporting trend continuation. "
        
    if not indicators.empty and "close" in indicators.columns and "bb_upper" in indicators.columns:
        close = indicators["close"].iloc[-1]
        upper = indicators["bb_upper"].iloc[-1]
        lower = indicators["bb_lower"].iloc[-1]
        rep += f"Price action is compressed between a **resistance ceiling of {upper:.2f}** and **support floor of {lower:.2f}** (Bollinger 2σ).\n\n"

    # 2. Options Sentiment
    rep += "### 2. Options Sentiment & Derived Flow\n"
    pcr_val = pcr.get("pcr_oi", 0)
    rep += f"The **Put-Call Ratio (PCR) is calculated at {pcr_val}**. "
    if pcr_val > 1.2:
        rep += "High put concentration indicates extreme market fear, which historically functions as a contrarian indicator for a bullish structural shift. "
    elif pcr_val < 0.6:
        rep += "Excessive call volume suggests market complacency, elevated Gamma risk, and potential for a sharp corrective flush. "
    else:
        rep += "Options flow is balanced, suggesting a standard consolidation phase without extreme skew.\n\n"

    # 3. Capital Directive
    rep += "### 3. Alpha-Weighted Capital Directive\n"
    rep += "**Strategic Action:** "
    if pcr_val > 1.2:
        rep += "Initiate 'Bullish Accumulation' at support levels. Focus on selling cash-secured puts to collect elevated IV premium. "
    elif pcr_val < 0.6:
        rep += "Implement 'Protective Hedging'. Trim long-delta exposure and purchase ATM Puts to protect realized capital gains. "
    else:
        rep += "Adopt a 'Market Neutral' stance. Focus on theta-decay strategies (Iron Condors) centered around the current strike equilibrium.\n\n"

    rep += "*Note: Quant-Engine generation constrained. Signal remains heuristic.*"
    return rep
