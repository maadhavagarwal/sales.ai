import pandas as pd
import numpy as np
from app.engines.market_dynamics_engine import MarketDynamicsEngine
from app.engines.quant_analyst import run_quant_analysis

def generate_mock_market_data():
    """Generates 30 days of synthetic OHLCV data for testing."""
    dates = pd.date_range(start='2026-02-01', periods=30)
    # Simulate a trending price with some volatility
    prices = [100.0]
    for _ in range(29):
        prices.append(prices[-1] * (1 + np.random.normal(0.005, 0.02)))
        
    df = pd.DataFrame({
        'date': dates,
        'open': [p * 0.99 for p in prices],
        'high': [p * 1.02 for p in prices],
        'low': [p * 0.98 for p in prices],
        'close': prices,
        'volume': np.random.randint(100000, 1000000, size=30)
    })
    return df

def generate_mock_option_chain(spot_price):
    """Generates an ATM/OTM option chain around a spot price."""
    strikes = [spot_price * s for s in [0.9, 0.95, 1.0, 1.05, 1.1]]
    data = []
    for strike in strikes:
        # Calls
        data.append({
            'strike': strike,
            'type': 'call',
            'open_interest': np.random.randint(500, 5000),
            'volume': np.random.randint(100, 1000),
            'iv': 0.25, # 25% IV
            'expiry_days': 30
        })
        # Puts
        data.append({
            'strike': strike,
            'type': 'put',
            'open_interest': np.random.randint(500, 5000),
            'volume': np.random.randint(100, 1000),
            'iv': 0.25,
            'expiry_days': 30
        })
    return pd.DataFrame(data)

def test_trading_intelligence():
    print("🚀 Initializing NeuralBI Trading Intelligence Test...\n")
    
    # 1. Generate Data
    df_market = generate_mock_market_data()
    spot_price = df_market['close'].iloc[-1]
    df_options = generate_mock_option_chain(spot_price)
    
    print(f"📊 Spot Price: ₹{spot_price:,.2f}")
    print(f"📁 Ingested {len(df_market)} Market Ticks and {len(df_options)} Option Contracts.\n")

    # 2. Run Market Dynamics Engine
    print("⚙️ Running Quantitative Engine (Greeks & Indicators)...")
    indicators = MarketDynamicsEngine.calculate_indicators(df_market)
    
    calls = df_options[df_options['type'] == 'call']
    puts = df_options[df_options['type'] == 'put']
    pcr_data = MarketDynamicsEngine.calculate_pcr(calls, puts)
    
    # Calculate Greeks for an ATM Call
    atm_call_greeks = MarketDynamicsEngine.black_scholes_greeks(
        S=spot_price, K=spot_price, T=30/365, r=0.07, sigma=0.25, option_type='call'
    )
    
    print(f"✅ RSI: {indicators['rsi'].iloc[-1]:.2f}")
    print(f"✅ BB Upper: {indicators['bb_upper'].iloc[-1]:.2f} | BB Lower: {indicators['bb_lower'].iloc[-1]:.2f}")
    print(f"✅ PCR (Sentiment): {pcr_data['pcr_oi']} ({pcr_data['sentiment']})")
    print(f"✅ ATM Call Delta: {atm_call_greeks['delta']} | Theta: {atm_call_greeks['theta']}\n")

    # 3. Run AI Quant Analyst
    print("🧠 Triggering AI Quant Analyst Strategy Brief...")
    market_context = {
        "indicators": indicators,
        "pcr": pcr_data
    }
    # Mock analytics to avoid full pipeline overhead
    mock_analytics = {"current_sentiment": pcr_data['sentiment']}
    
    analysis = run_quant_analysis(df_market, mock_analytics, market_context)
    
    print("\n--- 📝 STRATEGY BRIEF ---")
    print(analysis['report'])
    print("-------------------------\n")
    
    print("🏆 Test Complete: NeuralBI Trading Intelligence is Operational.")

if __name__ == "__main__":
    test_trading_intelligence()
