# indicators.py
# Calculates RSI, MACD, Bollinger Bands from price data

import pandas as pd
import numpy as np


def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    delta  = prices.diff()
    gain   = delta.clip(lower=0)
    loss   = -delta.clip(upper=0)
    avg_g  = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_l  = loss.ewm(com=period - 1, min_periods=period).mean()
    rs     = avg_g / avg_l
    return 100 - (100 / (1 + rs))


def calculate_macd(prices: pd.Series):
    ema12  = prices.ewm(span=12, adjust=False).mean()
    ema26  = prices.ewm(span=26, adjust=False).mean()
    macd   = ema12 - ema26
    signal = macd.ewm(span=9, adjust=False).mean()
    hist   = macd - signal
    return macd, signal, hist


def calculate_bollinger(prices: pd.Series, period: int = 20):
    sma    = prices.rolling(window=period).mean()
    std    = prices.rolling(window=period).std()
    upper  = sma + (2 * std)
    lower  = sma - (2 * std)
    return upper, sma, lower


def get_all_indicators(df: pd.DataFrame) -> dict:
    prices = df["close"]

    # RSI
    rsi    = calculate_rsi(prices)

    # MACD
    macd, signal, hist = calculate_macd(prices)

    # Bollinger Bands
    bb_upper, bb_mid, bb_lower = calculate_bollinger(prices)

    # Moving averages
    ma20   = prices.rolling(20).mean()
    ma50   = prices.rolling(50).mean()

    # Get last 60 rows for chart
    n = 60
    dates = df["date"].astype(str).tolist()[-n:]

    def clean(series):
        return [
            round(float(v), 2) if not pd.isna(v) else None
            for v in series.tolist()[-n:]
        ]

    # Current values (latest)
    current_rsi    = round(float(rsi.iloc[-1]),    2) if not pd.isna(rsi.iloc[-1])    else 0
    current_macd   = round(float(macd.iloc[-1]),   4) if not pd.isna(macd.iloc[-1])   else 0
    current_signal = round(float(signal.iloc[-1]), 4) if not pd.isna(signal.iloc[-1]) else 0
    current_ma20   = round(float(ma20.iloc[-1]),   2) if not pd.isna(ma20.iloc[-1])   else 0
    current_ma50   = round(float(ma50.iloc[-1]),   2) if not pd.isna(ma50.iloc[-1])   else 0
    latest_price   = round(float(prices.iloc[-1]), 2)

    # RSI signal
    if current_rsi >= 70:
        rsi_signal = "Overbought"
        rsi_color  = "red"
    elif current_rsi <= 30:
        rsi_signal = "Oversold"
        rsi_color  = "green"
    else:
        rsi_signal = "Neutral"
        rsi_color  = "amber"

    # MACD signal
    macd_signal_text = "Bullish" if current_macd > current_signal else "Bearish"
    macd_color       = "green"  if current_macd > current_signal else "red"

    # MA signal
    ma_signal = "Bullish" if latest_price > current_ma50 else "Bearish"
    ma_color  = "green"   if latest_price > current_ma50 else "red"

    return {
        "dates":        dates,
        "close":        clean(prices),
        "rsi":          clean(rsi),
        "macd":         clean(macd),
        "macd_signal":  clean(signal),
        "macd_hist":    clean(hist),
        "bb_upper":     clean(bb_upper),
        "bb_mid":       clean(bb_mid),
        "bb_lower":     clean(bb_lower),
        "ma20":         clean(ma20),
        "ma50":         clean(ma50),
        "summary": {
            "rsi":         current_rsi,
            "rsi_signal":  rsi_signal,
            "rsi_color":   rsi_color,
            "macd":        current_macd,
            "macd_signal": macd_signal_text,
            "macd_color":  macd_color,
            "ma20":        current_ma20,
            "ma50":        current_ma50,
            "ma_signal":   ma_signal,
            "ma_color":    ma_color,
        }
    }