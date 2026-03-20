import math

import numpy as np
import pandas as pd
from scipy.stats import norm


class MarketDynamicsEngine:
    """
    Sovereign Quantitative Engine for Technical Indicators & Option Greeks.
    Calculates market sentiment and risk physics entirely on-premise.
    """

    @staticmethod
    def calculate_indicators(df: pd.DataFrame, price_col="close"):
        """
        Calculates core technical indicators: RSI, Bollinger Bands, and MACD.
        """
        if price_col not in df.columns:
            return df

        df = df.copy()

        # 1. RSI (Relative Strength Index) Wilder's Smoothing
        delta = df[price_col].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(com=13, adjust=False).mean()
        avg_loss = loss.ewm(com=13, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        df["rsi"] = 100 - (100 / (1 + rs))
        df["rsi"] = df["rsi"].fillna(50.0)

        # 2. Bollinger Bands (20-day SMA +/- 2 Std Dev)
        df["sma_20"] = df[price_col].rolling(window=20, min_periods=1).mean()
        df["std_20"] = df[price_col].rolling(window=20, min_periods=1).std().fillna(0)
        df["bb_upper"] = df["sma_20"] + (df["std_20"] * 2)
        df["bb_lower"] = df["sma_20"] - (df["std_20"] * 2)

        # 3. MACD (Moving Average Convergence Divergence)
        exp1 = df[price_col].ewm(span=12, adjust=False).mean()
        exp2 = df[price_col].ewm(span=26, adjust=False).mean()
        df["macd"] = exp1 - exp2
        df["signal_line"] = df["macd"].ewm(span=9, adjust=False).mean()

        return df

    @staticmethod
    def calculate_pcr(
        calls_df: pd.DataFrame,
        puts_df: pd.DataFrame,
        oi_col="open_interest",
        vol_col="volume",
    ):
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
        if pcr_oi > 1.2:
            sentiment = "Bullish Reversal (Oversold)"
        elif pcr_oi < 0.6:
            sentiment = "Bearish Reversal (Overbought)"

        return {
            "pcr_oi": round(pcr_oi, 2),
            "pcr_vol": round(pcr_vol, 2),
            "sentiment": sentiment,
        }

    @staticmethod
    def black_scholes_greeks(S, K, T, r, sigma, option_type="call"):
        """
        Calculates Option Greeks using the Black-Scholes model.
        S: Spot Price, K: Strike Price, T: Time to Expiry (years), r: Risk-free rate, sigma: Implied Volatility
        """
        try:
            # Enforce bounds
            T = max(T, 1e-4)
            sigma = max(sigma, 1e-4)
            S = max(S, 1e-4)
            K = max(K, 1e-4)

            d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
            d2 = d1 - sigma * math.sqrt(T)

            # Options calculations
            pdf_d1 = norm.pdf(d1)
            cdf_d1 = norm.cdf(d1)
            cdf_d2 = norm.cdf(d2)
            norm.cdf(-d1)
            cdf_neg_d2 = norm.cdf(-d2)

            # 1. Delta
            if option_type == "call":
                delta = cdf_d1
                rho = (K * T * math.exp(-r * T) * cdf_d2) / 100
                theta = (
                    -S * pdf_d1 * sigma / (2 * math.sqrt(T))
                    - r * K * math.exp(-r * T) * cdf_d2
                ) / 365
            else:
                delta = cdf_d1 - 1
                rho = (-K * T * math.exp(-r * T) * cdf_neg_d2) / 100
                theta = (
                    -S * pdf_d1 * sigma / (2 * math.sqrt(T))
                    + r * K * math.exp(-r * T) * cdf_neg_d2
                ) / 365

            # 2. Gamma (Same for Call/Put)
            gamma = pdf_d1 / (S * sigma * math.sqrt(T))

            # 3. Vega (Same for Call/Put)
            vega = (S * pdf_d1 * math.sqrt(T)) / 100  # per 1% change in IV

            return {
                "delta": round(delta, 5),
                "gamma": round(gamma, 5),
                "vega": round(vega, 5),
                "theta": round(theta, 5),
                "rho": round(rho, 5),
            }
        except Exception:
            return {"delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0, "rho": 0.0}

    @staticmethod
    def analyze_option_chain(
        chain_df: pd.DataFrame, spot_price: float, risk_free_rate=0.07
    ):
        """
        Deep scan of an entire Option Chain. Calculates Greeks and identifies IV Skew.
        """
        # Assume chain_df has: strike, expiry_days, iv, type (call/put)
        if "expiry_days" not in chain_df.columns:
            chain_df["expiry_days"] = 30  # Default to monthly

        chain_df["expiry_years"] = chain_df["expiry_days"] / 365

        if "type" not in chain_df.columns:
            chain_df["type"] = "call"  # Fallback

        results = []
        for _, row in chain_df.iterrows():
            greeks = MarketDynamicsEngine.black_scholes_greeks(
                spot_price,
                row["strike"],
                row["expiry_years"],
                risk_free_rate,
                row["iv"],
                row["type"],
            )
            results.append({**row.to_dict(), **greeks})

        return pd.DataFrame(results)
