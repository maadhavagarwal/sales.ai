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
    
    # Optional implicit volatility approximation if IV not provided
    implied_vol_proxy = "Low"
    if not indicators.empty and "bb_upper" in indicators.columns and "bb_lower" in indicators.columns and "sma_20" in indicators.columns:
        bb_width = (indicators["bb_upper"].iloc[-1] - indicators["bb_lower"].iloc[-1]) / indicators["sma_20"].iloc[-1]
        if bb_width > 0.15: implied_vol_proxy = "High"
        elif bb_width > 0.08: implied_vol_proxy = "Elevated"
    
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
- Implied Volatility Proxy: {implied_vol_proxy}
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
            report = _generate_fallback_quant_report(indicators, pcr, analytics, implied_vol_proxy)
    except Exception:
        report = _generate_fallback_quant_report(indicators, pcr, analytics, implied_vol_proxy)

    return {
        "report": report,
        "sentiment": sentiment,
        "pcr": pcr_val
    }

def _generate_fallback_quant_report(indicators, pcr, analytics, implied_vol_proxy="Low"):
    """Rule-based heuristic fallback for Trading Intelligence including Multi-Leg Structuring."""
    
    rep = "### 📈 Quantitative Strategy Brief (Advanced Options Framing)\n\n"
    
    # 1. Technical Boundary Analysis
    rep += "### 1. Market Physics & Volatility Boundaries\n"
    rsi = 50.0
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
        rep += f"Price action is compressed between a **resistance ceiling of {upper:.2f}** and **support floor of {lower:.2f}** (Bollinger 2σ). "
        rep += f"Current derived volatility state is **{implied_vol_proxy}**.\n\n"

    # 2. Options Sentiment
    rep += "### 2. Options Sentiment & Derived Flow\n"
    pcr_val = pcr.get("pcr_oi", 1.0)
    rep += f"The **Put-Call Ratio (PCR) is anchored at {pcr_val}**. "
    if pcr_val > 1.2:
        rep += "High put concentration indicates extreme market fear, functioning as a contrarian indicator for a bullish structural shift. "
    elif pcr_val < 0.6:
        rep += "Excessive call volume suggests market complacency, elevated Gamma risk, and potential for a sharp corrective flush. "
    else:
        rep += "Options flow is balanced, suggesting a standard consolidation phase without extreme skew.\n\n"

    # 3. Multi-Leg Options & Capital Directive
    rep += "### 3. Alpha-Weighted Capital Directive (Multi-Leg Output)\n"
    rep += "**Automated Structuring Recommendation:**\n"
    
    high_iv = implied_vol_proxy in ["High", "Elevated"]
    
    if high_iv and pcr_val > 1.2:
        rep += "> **Bull Put Spread (Credit)**: Implied volatility is elevated alongside extreme fear (Oversold). Sell an At-The-Money (ATM) Put and buy a deeper Out-of-The-Money (OTM) Put to synthetically capture Premium crush as price reverts upward.\n\n"
    elif high_iv and pcr_val < 0.6:
        rep += "> **Bear Call Spread (Credit)**: Implied volatility is elevated and markets are overheated. Sell an ATM Call and buy an OTM Call to collect rich premiums as the asset exhausts upside velocity.\n\n"
    elif high_iv and 0.6 <= pcr_val <= 1.2:
        rep += "> **Iron Condor (Delta-Neutral)**: Market exhibits High IV but Neutral flow. Capitalize on sideways consolidation by simultaneously executing an OTM Bear Call Spread and OTM Bull Put Spread. Maximum profit achieved if spot price pins between inner strikes.\n\n"
    elif not high_iv and rsi > 55:
        rep += "> **Bull Call Spread (Debit)**: Volatility is thoroughly depressed while uptrend momentum holds. Purchase ATM Calls funded heavily by selling OTM Calls to finance a high-probability bullish directional run at near negligible net debit.\n\n"
    elif not high_iv and rsi < 45:
        rep += "> **Bear Put Spread (Debit)**: Suppressed volatility coupled with downward momentum. Purchase ATM Puts funded by scaling into shorts on OTM Puts to finance a cheap, low-IV downside directional strike.\n\n"
    else:
        rep += "> **Diagonal Calendar Spread**: Environment reflects ultra-suppressed volatility and stagnant price progression. Sell front-month near-term strikes to harvest theta while simultaneously purchasing long-dated deferred optionality.\n\n"

    rep += "*Note: Quant-Engine multi-leg structural recommendations are mathematically synthesized via local volatility-sentiment matrices.*"
    return rep
