import numpy as np
import pandas as pd
from scipy.stats import norm
import math

class MarketDynamicsEngine:
    """
    Sovereign Quantitative Engine for Technical Indicators & Option Greeks.
    Calculates market sentiment and risk physics entirely on-premise.
    """

    @staticmethod
    def calculate_indicators(df: pd.DataFrame, price_col='close'):
        """
        Calculates core technical indicators: RSI, Bollinger Bands, and MACD.
        """
        if price_col not in df.columns:
            return df
            
        # 1. RSI (Relative Strength Index)
        delta = df[price_col].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))

        # 2. Bollinger Bands (20-day SMA +/- 2 Std Dev)
        df['sma_20'] = df[price_col].rolling(window=20).mean()
        df['std_20'] = df[price_col].rolling(window=20).std()
        df['bb_upper'] = df['sma_20'] + (df['std_20'] * 2)
        df['bb_lower'] = df['sma_20'] - (df['std_20'] * 2)

        # 3. MACD (Moving Average Convergence Divergence)
        exp1 = df[price_col].ewm(span=12, adjust=False).mean()
        exp2 = df[price_col].ewm(span=26, adjust=False).mean()
        df['macd'] = exp1 - exp2
        df['signal_line'] = df['macd'].ewm(span=9, adjust=False).mean()

        return df

    @staticmethod
    def calculate_pcr(calls_df: pd.DataFrame, puts_df: pd.DataFrame, oi_col='open_interest', vol_col='volume'):
        """
        Calculates Put-Call Ratio based on Open Interest and Volume.
        Sentiment: > 1.0 (Oversold/Bullish Reversal), < 0.7 (Overbought/Bearish Reversal).
        """
        total_call_oi = calls_df[oi_col].sum() if oi_col in calls_df.columns else 0
        total_put_oi = puts_df[oi_col].sum() if oi_col in puts_df.columns else 0
        
        pcr_oi = total_put_oi / total_call_oi if total_call_oi > 0 else 0
        
        total_call_vol = calls_df[vol_col].sum() if vol_col in calls_df.columns else 0
        total_put_vol = puts_df[vol_col].sum() if vol_col in puts_df.columns else 0
        pcr_vol = total_put_vol / total_call_vol if total_call_vol > 0 else 0
        
        sentiment = "Neutral"
        if pcr_oi > 1.2: sentiment = "Bullish Reversal (Oversold)"
        elif pcr_oi < 0.6: sentiment = "Bearish Reversal (Overbought)"
        
        return {
            "pcr_oi": round(pcr_oi, 2),
            "pcr_vol": round(pcr_vol, 2),
            "sentiment": sentiment
        }

    @staticmethod
    def black_scholes_greeks(S, K, T, r, sigma, option_type='call'):
        """
        Calculates Option Greeks using the Black-Scholes model.
        S: Spot Price, K: Strike Price, T: Time to Expiry (years), r: Risk-free rate, sigma: Implied Volatility
        """
        try:
            d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
            d2 = d1 - sigma * math.sqrt(T)
            
            # 1. Delta
            if option_type == 'call':
                delta = norm.cdf(d1)
            else:
                delta = norm.cdf(d1) - 1
                
            # 2. Gamma (Same for Call/Put)
            gamma = norm.pdf(d1) / (S * sigma * math.sqrt(T))
            
            # 3. Vega (Same for Call/Put)
            vega = S * norm.pdf(d1) * math.sqrt(T) / 100 # per 1% change in IV
            
            # 4. Theta (Decay)
            if option_type == 'call':
                theta = (-S * norm.pdf(d1) * sigma / (2 * math.sqrt(T)) - r * K * math.exp(-r * T) * norm.cdf(d2)) / 365
            else:
                theta = (-S * norm.pdf(d1) * sigma / (2 * math.sqrt(T)) + r * K * math.exp(-r * T) * norm.cdf(-d2)) / 365

            return {
                "delta": round(delta, 4),
                "gamma": round(gamma, 4),
                "vega": round(vega, 4),
                "theta": round(theta, 4)
            }
        except Exception:
            return {"delta": 0, "gamma": 0, "vega": 0, "theta": 0}

    @staticmethod
    def analyze_option_chain(chain_df: pd.DataFrame, spot_price: float, risk_free_rate=0.07):
        """
        Deep scan of an entire Option Chain. Calculates Greeks and identifies IV Skew.
        """
        # Assume chain_df has: strike, expiry_days, iv, type (call/put)
        if 'expiry_days' not in chain_df.columns:
            chain_df['expiry_days'] = 30 # Default to monthly
            
        chain_df['expiry_years'] = chain_df['expiry_days'] / 365
        
        if 'type' not in chain_df.columns:
            chain_df['type'] = 'call' # Fallback
            
        results = []
        for _, row in chain_df.iterrows():
            greeks = MarketDynamicsEngine.black_scholes_greeks(
                spot_price, 
                row['strike'], 
                row['expiry_years'], 
                risk_free_rate, 
                row['iv'], 
                row['type']
            )
            results.append({**row.to_dict(), **greeks})
            
        return pd.DataFrame(results)
