# api_server.py
# NeuroTrade - Day 3
# FastAPI server that exposes ML model results as REST APIs
# Run with: uvicorn api_server:app --reload --port 8000

import numpy as np
import pandas as pd
import warnings
import os
warnings.filterwarnings("ignore")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sklearn.preprocessing import MinMaxScaler

from config import DATABASE_URL, STOCKS

from auth_models import create_auth_tables
from auth_routes import router as auth_router

from indicators import get_all_indicators
from alerts     import create_alerts_table, check_alerts

from stock_simulator import (
    create_simulator_tables, initialize_prices,
    tick, get_live_prices, get_live_price
)
from apscheduler.schedulers.background import BackgroundScheduler

from trading_bot import (
    create_bot_tables, run_bot_tick,
    get_bot_config, update_bot_config,
    get_bot_trades, get_bot_logs
)

from fastapi import Depends, Header
from typing import Optional

from pydantic import BaseModel

class OrderRequest(BaseModel):
    symbol:   str
    action:   str
    quantity: int

class AlertRequest(BaseModel):
    symbol:       str
    target_price: float
    condition:    str
    note:         str = ""

def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[int]:
    """Extract user ID from JWT token. Returns None if not authenticated."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        from auth_utils import decode_token
        token   = authorization.split(" ")[1]
        payload = decode_token(token)
        return payload.get("user_id") if payload else None
    except:
        return None

def check_and_trigger_alerts():
    """Check all active alerts against live prices and trigger them."""
    with engine.connect() as conn:
        alerts = conn.execute(text("""
            SELECT id, symbol, target_price, condition, note
            FROM   price_alerts
            WHERE  is_triggered = FALSE
        """)).fetchall()

        live_prices = conn.execute(text("""
            SELECT symbol, price FROM live_prices
        """)).fetchall()

    price_map = {r[0]: float(r[1]) for r in live_prices}

    triggered = []
    for alert in alerts:
        alert_id   = alert[0]
        symbol     = alert[1]
        target     = float(alert[2])
        condition  = alert[3]
        note       = alert[4]

        current = price_map.get(symbol)
        if not current:
            continue

        hit = (condition == "above" and current >= target) or \
              (condition == "below" and current <= target)

        if hit:
            with engine.begin() as conn:
                conn.execute(text("""
                    UPDATE price_alerts
                    SET    is_triggered = TRUE,
                           triggered_at = NOW()
                    WHERE  id = :id
                """), {"id": alert_id})

            triggered.append({
                "symbol":        symbol,
                "target_price":  target,
                "current_price": current,
                "condition":     condition,
                "note":          note,
            })
            print(f"   ALERT TRIGGERED: {symbol} {condition} ₹{target} (current: ₹{current})")

    return triggered


# ─────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────

app = FastAPI(
    title="NeuroTrade AI API",
    description="Stock prediction API powered by LSTM + FinBERT",
    version="1.0.0"
)



app.include_router(auth_router)

# Allow React frontend (port 3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

engine = create_engine(DATABASE_URL)

# ─────────────────────────────────────────────────────
# LOAD ALL MODELS INTO MEMORY ON STARTUP
# ─────────────────────────────────────────────────────

models  = {}
scalers = {}

@app.on_event("startup")
async def load_models():
    from tensorflow.keras.models import load_model

    create_auth_tables()
    create_alerts_table()

    print("\n Loading trained models into memory...")

    for symbol in STOCKS:
        clean     = symbol.replace(".", "_")
        model_path = f"models/lstm_{clean}.h5"

        if not os.path.exists(model_path):
            print(f"   WARNING: Model not found for {symbol} — run train_model.py first")
            continue

        try:
            # Load the saved LSTM model
            models[symbol] = load_model(model_path)

            # Rebuild the scaler using the same stock data
            with engine.connect() as conn:
                df = pd.read_sql(
                    text("""
                        SELECT close FROM stock_prices
                        WHERE  symbol = :symbol
                        ORDER  BY date ASC
                    """),
                    conn,
                    params={"symbol": symbol}
                )

            scaler = MinMaxScaler(feature_range=(0, 1))
            scaler.fit_transform(df["close"].values.reshape(-1, 1))
            scalers[symbol] = scaler

            print(f"   Loaded model for {symbol}")

        except Exception as e:
            print(f"   ERROR loading {symbol}: {e}")

    print(f"   {len(models)} models ready.\n")

    # Initialize price simulator
    create_simulator_tables()
    initialize_prices()

    # Start price tick scheduler — updates every 3 seconds
    scheduler = BackgroundScheduler()
    scheduler.add_job(tick, 'interval', seconds=3, id='price_tick')
    scheduler.start()
    print("   Price simulator started — ticking every 3 seconds.")

    create_bot_tables()
    scheduler.add_job(
        run_bot_tick, 'interval',
        seconds=30, id='bot_tick'
    )
    print("   AI trading bot ready.")

    scheduler.add_job(
        check_and_trigger_alerts,
        'interval',
        seconds=5,
        id='alert_checker'
    )
    print("   Alert checker started — checking every 5 seconds.")


# ─────────────────────────────────────────────────────
# HELPER: Get latest prediction from database
# ─────────────────────────────────────────────────────

def get_prediction_from_db(symbol):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT
                predicted_price,
                confidence_score,
                sentiment_score,
                price_signal,
                prediction_date
            FROM  predictions
            WHERE symbol = :symbol
            ORDER BY prediction_date DESC
            LIMIT 1
        """), {"symbol": symbol})
        row = result.fetchone()
    return row


# ─────────────────────────────────────────────────────
# HELPER: Get historical prices for chart
# ─────────────────────────────────────────────────────

def get_price_history(symbol, days=60):
    with engine.connect() as conn:
        df = pd.read_sql(
            text("""
                SELECT date, close
                FROM   stock_prices
                WHERE  symbol = :symbol
                ORDER  BY date DESC
                LIMIT  :days
            """),
            conn,
            params={"symbol": symbol, "days": days}
        )
    df = df.sort_values("date")
    return df


# ─────────────────────────────────────────────────────
# HELPER: Live prediction using loaded model
# ─────────────────────────────────────────────────────

def predict_live(symbol):
    if symbol not in models:
        return None, None

    model  = models[symbol]
    scaler = scalers[symbol]

    with engine.connect() as conn:
        df = pd.read_sql(
            text("""
                SELECT close FROM stock_prices
                WHERE  symbol = :symbol
                ORDER  BY date DESC
                LIMIT  60
            """),
            conn,
            params={"symbol": symbol}
        )

    if len(df) < 60:
        return None, None

    prices     = df["close"].values[::-1].reshape(-1, 1)
    scaled     = scaler.transform(prices)
    X          = scaled.reshape(1, 60, 1)
    pred_scaled = model.predict(X, verbose=0)
    pred_price  = float(scaler.inverse_transform(pred_scaled)[0][0])
    current     = float(df["close"].values[0])
    change_pct  = ((pred_price - current) / current) * 100

    return pred_price, change_pct


# ─────────────────────────────────────────────────────
# ROUTE 1: Health check
# GET /
# ─────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status":  "running",
        "message": "NeuroTrade AI API is live",
        "models_loaded": list(models.keys()),
        "endpoints": [
            "/stocks",
            "/predict/{symbol}",
            "/sentiment/{symbol}",
            "/history/{symbol}",
            "/summary"
        ]
    }


# ─────────────────────────────────────────────────────
# ROUTE 2: List all available stocks
# GET /stocks
# ─────────────────────────────────────────────────────

@app.get("/stocks")
def get_stocks():
    import math
    stock_list = []

    def safe_float(val, default=0.0):
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f):
                return default
            return round(f, 2)
        except:
            return default

    for symbol in STOCKS:
        try:
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT close, date
                    FROM   stock_prices
                    WHERE  symbol = :symbol
                    ORDER  BY date DESC
                    LIMIT  2
                """), {"symbol": symbol})
                rows = result.fetchall()

            if len(rows) >= 2:
                current  = safe_float(rows[0][0])
                previous = safe_float(rows[1][0])
                change   = round(((current - previous) / previous) * 100, 2) \
                           if previous > 0 else 0.0
            else:
                current = 0.0
                change  = 0.0

            # Get confidence from predictions if available
            pred_row   = get_prediction_from_db(symbol)
            confidence = safe_float(pred_row[1]) if pred_row else 0.0

            # Use live price if available
            with engine.connect() as conn:
                live = conn.execute(text("""
                    SELECT price, change_pct FROM live_prices
                    WHERE  symbol = :symbol
                """), {"symbol": symbol}).fetchone()

            if live:
                current = safe_float(live[0], current)
                change  = safe_float(live[1], change)

            stock_list.append({
                "symbol":     symbol,
                "name":       symbol.replace(".NS", ""),
                "price":      current,
                "change_pct": change,
                "confidence": confidence,
                "signal":     "BUY"     if confidence >= 65
                              else "HOLD"    if confidence >= 40
                              else "CAUTION" if confidence > 0
                              else "N/A",
            })

        except Exception as e:
            print(f"   Warning: Could not load {symbol}: {e}")
            stock_list.append({
                "symbol":     symbol,
                "name":       symbol.replace(".NS", ""),
                "price":      0.0,
                "change_pct": 0.0,
                "confidence": 0.0,
                "signal":     "N/A",
            })

    return {"stocks": stock_list}


# ─────────────────────────────────────────────────────
# ROUTE 3: Prediction for a specific stock
# GET /predict/{symbol}
# ─────────────────────────────────────────────────────

@app.get("/predict/{symbol}")
def get_prediction(symbol: str):
    import math

    def safe(val, default=0.0):
        try:
            f = float(val)
            return default if math.isnan(f) or math.isinf(f) else round(f, 2)
        except:
            return default

    symbol = symbol.upper()

    if symbol not in STOCKS:
        raise HTTPException(
            status_code=404,
            detail=f"{symbol} not found. Available: {STOCKS}"
        )

    # Get stored prediction if available
    pred_row = get_prediction_from_db(symbol)

    # Get live price
    with engine.connect() as conn:
        live = conn.execute(text("""
            SELECT price, change_pct FROM live_prices
            WHERE  symbol = :symbol
        """), {"symbol": symbol}).fetchone()

        hist = conn.execute(text("""
            SELECT close, date FROM stock_prices
            WHERE  symbol = :symbol
            ORDER  BY date DESC LIMIT 1
        """), {"symbol": symbol}).fetchone()

    current_price = safe(live[0]) if live else safe(hist[0]) if hist else 0.0
    change_pct    = safe(live[1]) if live else 0.0
    latest_date   = str(hist[1]) if hist else ""

    # If no prediction exists yet use current price as predicted
    if pred_row:
        predicted_price  = safe(pred_row[0], current_price)
        confidence_score = safe(pred_row[1], 0.0)
        sentiment_score  = safe(pred_row[2], 0.0)
        price_signal     = safe(pred_row[3], 0.0)
        prediction_date  = str(pred_row[4])
    else:
        predicted_price  = current_price
        confidence_score = 0.0
        sentiment_score  = 0.0
        price_signal     = 0.0
        prediction_date  = latest_date

    # Live prediction if model loaded
    live_price, live_change = predict_live(symbol)
    if live_price:
        predicted_price = safe(live_price, predicted_price)
        change_pct      = safe(live_change, change_pct)

    if confidence_score >= 65:
        signal = "BUY"
        color  = "green"
    elif confidence_score >= 40:
        signal = "HOLD"
        color  = "amber"
    else:
        signal = "CAUTION"
        color  = "red"

    return {
        "symbol":          symbol,
        "current_price":   current_price,
        "predicted_price": round(predicted_price, 2),
        "change_pct":      round(change_pct, 2),
        "confidence":      confidence_score,
        "signal":          signal,
        "color":           color,
        "sentiment_score": sentiment_score,
        "price_signal":    price_signal,
        "latest_date":     latest_date,
        "prediction_date": prediction_date,
    }

# ─────────────────────────────────────────────────────
# ROUTE 4: Sentiment for a specific stock
# GET /sentiment/{symbol}
# ─────────────────────────────────────────────────────

SAMPLE_HEADLINES = {
    "RELIANCE.NS": [
        {"headline": "Reliance Industries posts record quarterly profit on retail surge",     "sentiment": "positive", "score":  0.91},
        {"headline": "Reliance Jio adds 8 million subscribers in Q3",                        "sentiment": "neutral",  "score":  0.00},
        {"headline": "Reliance faces regulatory scrutiny over telecom pricing",               "sentiment": "negative", "score": -0.86},
        {"headline": "Mukesh Ambani announces major green energy investment plan",            "sentiment": "neutral",  "score":  0.00},
        {"headline": "Reliance shares fall as oil refining margins compress",                 "sentiment": "negative", "score": -0.97},
    ],
    "TCS.NS": [
        {"headline": "TCS wins $2 billion deal with European banking giant",                  "sentiment": "positive", "score":  0.87},
        {"headline": "TCS Q3 revenue beats analyst estimates by wide margin",                 "sentiment": "positive", "score":  0.94},
        {"headline": "TCS warns of slowdown in BFSI segment demand",                         "sentiment": "negative", "score": -0.96},
        {"headline": "Tata Consultancy Services expands AI practice globally",               "sentiment": "positive", "score":  0.82},
        {"headline": "TCS attrition rate rises amid competitive hiring market",              "sentiment": "positive", "score":  0.77},
    ],
    "INFY.NS": [
        {"headline": "Infosys raises full year revenue guidance after strong Q2",             "sentiment": "positive", "score":  0.91},
        {"headline": "Infosys secures large cloud transformation deal in US",                 "sentiment": "positive", "score":  0.92},
        {"headline": "Infosys faces client budget cuts in discretionary spending",            "sentiment": "negative", "score": -0.96},
        {"headline": "Infosys AI platform Topaz sees strong enterprise adoption",            "sentiment": "positive", "score":  0.91},
        {"headline": "Infosys employee headcount declines for second straight quarter",      "sentiment": "negative", "score": -0.97},
    ],
    "HDFCBANK.NS": [
        {"headline": "HDFC Bank reports strong loan growth in retail segment",               "sentiment": "positive", "score":  0.89},
        {"headline": "HDFC Bank net interest margin improves in Q3 results",                 "sentiment": "positive", "score":  0.85},
        {"headline": "HDFC Bank faces pressure on deposit mobilisation",                     "sentiment": "negative", "score": -0.78},
        {"headline": "HDFC Bank expands digital banking services across India",              "sentiment": "positive", "score":  0.83},
        {"headline": "HDFC Bank credit card business sees slowdown in spends",               "sentiment": "negative", "score": -0.72},
    ],
    "ICICIBANK.NS": [
        {"headline": "ICICI Bank profit jumps 25 percent driven by retail loans",           "sentiment": "positive", "score":  0.92},
        {"headline": "ICICI Bank digital transactions cross 1 billion mark",                "sentiment": "positive", "score":  0.88},
        {"headline": "ICICI Bank sees rise in gross NPA in agriculture segment",            "sentiment": "negative", "score": -0.81},
        {"headline": "ICICI Bank launches new wealth management platform",                  "sentiment": "positive", "score":  0.79},
        {"headline": "ICICI Bank cautious on unsecured lending amid RBI guidelines",        "sentiment": "negative", "score": -0.74},
    ],
    "HINDUNILVR.NS": [
        {"headline": "Hindustan Unilever volume growth recovers in rural markets",          "sentiment": "positive", "score":  0.86},
        {"headline": "HUL launches premium skincare range targeting urban consumers",        "sentiment": "positive", "score":  0.81},
        {"headline": "HUL faces margin pressure due to rising palm oil prices",             "sentiment": "negative", "score": -0.83},
        {"headline": "Hindustan Unilever maintains market leadership in home care",         "sentiment": "positive", "score":  0.77},
        {"headline": "HUL revenue growth slows amid competitive FMCG landscape",           "sentiment": "negative", "score": -0.69},
    ],
    "BAJFINANCE.NS": [
        {"headline": "Bajaj Finance AUM crosses Rs 3 lakh crore milestone",                "sentiment": "positive", "score":  0.93},
        {"headline": "Bajaj Finance launches new EMI card for rural customers",             "sentiment": "positive", "score":  0.84},
        {"headline": "Bajaj Finance raises concerns over rising delinquencies",             "sentiment": "negative", "score": -0.88},
        {"headline": "Bajaj Finance Q3 profit up 28 percent year on year",                 "sentiment": "positive", "score":  0.90},
        {"headline": "Bajaj Finance stock falls on RBI scrutiny of NBFC sector",           "sentiment": "negative", "score": -0.85},
    ],
    "WIPRO.NS": [
        {"headline": "Wipro wins large IT transformation deal in Europe",                   "sentiment": "positive", "score":  0.87},
        {"headline": "Wipro revenue guidance disappoints analysts expectations",            "sentiment": "negative", "score": -0.82},
        {"headline": "Wipro expands AI and cloud capabilities with new acquisition",        "sentiment": "positive", "score":  0.83},
        {"headline": "Wipro headcount reduction continues for third straight quarter",      "sentiment": "negative", "score": -0.79},
        {"headline": "Wipro partners with major US bank for digital transformation",        "sentiment": "positive", "score":  0.80},
    ],
    "AXISBANK.NS": [
        {"headline": "Axis Bank profit surges on strong retail and SME loan growth",        "sentiment": "positive", "score":  0.91},
        {"headline": "Axis Bank completes integration of Citibank India business",         "sentiment": "positive", "score":  0.86},
        {"headline": "Axis Bank gross NPA rises marginally in Q3 FY25",                    "sentiment": "negative", "score": -0.74},
        {"headline": "Axis Bank launches premium credit card for affluent segment",        "sentiment": "positive", "score":  0.78},
        {"headline": "Axis Bank faces pressure on CASA ratio amid rising rates",           "sentiment": "negative", "score": -0.71},
    ],
    "KOTAKBANK.NS": [
        {"headline": "Kotak Mahindra Bank reports robust growth in wealth management",     "sentiment": "positive", "score":  0.88},
        {"headline": "Kotak Bank RBI restriction on digital onboarding lifted",            "sentiment": "positive", "score":  0.94},
        {"headline": "Kotak Bank net interest income growth slows in Q3",                  "sentiment": "negative", "score": -0.73},
        {"headline": "Kotak Bank expands merchant payments platform across India",         "sentiment": "positive", "score":  0.81},
        {"headline": "Kotak Bank faces increased competition in premium banking segment",  "sentiment": "negative", "score": -0.68},
    ],
    "MARUTI.NS": [
        {"headline": "Maruti Suzuki reports highest ever monthly sales in October",        "sentiment": "positive", "score":  0.93},
        {"headline": "Maruti Suzuki launches new SUV to compete in premium segment",       "sentiment": "positive", "score":  0.85},
        {"headline": "Maruti Suzuki faces margin pressure from rising input costs",        "sentiment": "negative", "score": -0.79},
        {"headline": "Maruti Suzuki hybrid vehicles see strong demand in urban markets",   "sentiment": "positive", "score":  0.82},
        {"headline": "Maruti Suzuki export growth slows due to global slowdown",           "sentiment": "negative", "score": -0.75},
    ],
    "SUNPHARMA.NS": [
        {"headline": "Sun Pharma US specialty business shows strong double digit growth",  "sentiment": "positive", "score":  0.90},
        {"headline": "Sun Pharma receives USFDA approval for key dermatology drug",        "sentiment": "positive", "score":  0.93},
        {"headline": "Sun Pharma faces pricing pressure in generic drugs market",          "sentiment": "negative", "score": -0.77},
        {"headline": "Sun Pharma India business grows on back of chronic therapies",       "sentiment": "positive", "score":  0.84},
        {"headline": "Sun Pharma USFDA inspection at key plant raises concerns",           "sentiment": "negative", "score": -0.86},
    ],
    "TITAN.NS": [
        {"headline": "Titan Company jewellery segment grows 20 percent in festive quarter","sentiment": "positive", "score":  0.91},
        {"headline": "Titan watches and wearables business crosses Rs 1000 crore revenue", "sentiment": "positive", "score":  0.86},
        {"headline": "Titan faces gold price headwinds impacting jewellery margins",       "sentiment": "negative", "score": -0.78},
        {"headline": "Titan CaratLane expansion drives strong omnichannel growth",         "sentiment": "positive", "score":  0.83},
        {"headline": "Titan eyecare and fragrance segments show slower recovery",          "sentiment": "negative", "score": -0.70},
    ],
    "LTIM.NS": [
        {"headline": "LTIMindtree wins multi year digital transformation deal",            "sentiment": "positive", "score":  0.89},
        {"headline": "LTIMindtree Q3 revenue growth beats Street estimates",               "sentiment": "positive", "score":  0.87},
        {"headline": "LTIMindtree sees weakness in BFSI and hi-tech verticals",           "sentiment": "negative", "score": -0.80},
        {"headline": "LTIMindtree expands AI Centre of Excellence capabilities",           "sentiment": "positive", "score":  0.84},
        {"headline": "LTIMindtree attrition rises as talent market heats up",              "sentiment": "negative", "score": -0.72},
    ],
    "ADANIENT.NS": [
        {"headline": "Adani Enterprises wins major airport infrastructure contract",       "sentiment": "positive", "score":  0.88},
        {"headline": "Adani Group expands green hydrogen business with new projects",      "sentiment": "positive", "score":  0.85},
        {"headline": "Adani Enterprises faces scrutiny over related party transactions",   "sentiment": "negative", "score": -0.89},
        {"headline": "Adani Enterprises data centre business sees strong order wins",      "sentiment": "positive", "score":  0.82},
        {"headline": "Adani stock under pressure amid global investor concerns",           "sentiment": "negative", "score": -0.84},
    ],
}

@app.get("/sentiment/{symbol}")
def get_sentiment(symbol: str):
    symbol = symbol.upper()

    if symbol not in STOCKS:
        raise HTTPException(
        status_code=404,
        detail=f"{symbol} not found. Available: {STOCKS}"
    )

    headlines = SAMPLE_HEADLINES.get(symbol, [])
    scores    = [h["score"] for h in headlines]
    avg       = round(float(np.mean(scores)), 4)

    if avg > 0.1:
        overall = "positive"
    elif avg < -0.1:
        overall = "negative"
    else:
        overall = "neutral"

    return {
        "symbol":    symbol,
        "overall":   overall,
        "avg_score": avg,
        "headlines": headlines,
        "total":     len(headlines),
    }


# ─────────────────────────────────────────────────────
# ROUTE 5: Price history for chart
# GET /history/{symbol}?days=60
# ─────────────────────────────────────────────────────

@app.get("/history/{symbol}")
def get_history(symbol: str, days: int = 60):
    symbol = symbol.upper()

    if symbol not in STOCKS:
        raise HTTPException(
            status_code=404,
            detail=f"{symbol} not found."
        )

    df = get_price_history(symbol, days)

    history = [
        {
            "date":  str(row["date"]),
            "close": round(float(row["close"]), 2)
        }
        for _, row in df.iterrows()
    ]

    return {
        "symbol":  symbol,
        "days":    days,
        "history": history,
    }


# ─────────────────────────────────────────────────────
# ROUTE 6: Full summary of all stocks
# GET /summary
# ─────────────────────────────────────────────────────

@app.get("/summary")
def get_summary():
    summary = []

    for symbol in STOCKS:
        pred_row = get_prediction_from_db(symbol)

        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT close FROM stock_prices
                WHERE  symbol = :symbol
                ORDER  BY date DESC
                LIMIT  1
            """), {"symbol": symbol})
            row = result.fetchone()

        current    = float(row[0]) if row else 0
        predicted  = float(pred_row[0]) if pred_row else 0
        confidence = float(pred_row[1]) if pred_row else 0
        sentiment  = float(pred_row[2]) if pred_row else 0

        summary.append({
            "symbol":          symbol,
            "current_price":   round(current, 2),
            "predicted_price": round(predicted, 2),
            "confidence":      round(confidence, 2),
            "sentiment":       round(sentiment, 4),
            "signal":          "BUY" if confidence >= 65
                               else "HOLD" if confidence >= 40
                               else "CAUTION"
        })

    return {"summary": summary, "total_stocks": len(summary)}

    # ─────────────────────────────────────────────────────
# ROUTE 7: Candlestick data (OHLC)
# GET /candles/{symbol}?days=60
# ─────────────────────────────────────────────────────

@app.get("/candles/{symbol}")
def get_candles(symbol: str, days: int = 60):
    symbol = symbol.upper()

    if symbol not in STOCKS:
        raise HTTPException(
            status_code=404,
            detail=f"{symbol} not found."
        )

    with engine.connect() as conn:
        df = pd.read_sql(
            text("""
                SELECT date, open, high, low, close, volume
                FROM   stock_prices
                WHERE  symbol = :symbol
                ORDER  BY date DESC
                LIMIT  :days
            """),
            conn,
            params={"symbol": symbol, "days": days}
        )

    df = df.sort_values("date")

    candles = [
        {
            "date":   str(row["date"]),
            "open":   round(float(row["open"]),   2),
            "high":   round(float(row["high"]),   2),
            "low":    round(float(row["low"]),    2),
            "close":  round(float(row["close"]),  2),
            "volume": int(row["volume"]),
        }
        for _, row in df.iterrows()
    ]

    return {
        "symbol":  symbol,
        "days":    days,
        "candles": candles,
    }


# ─────────────────────────────────────────────────────
# ROUTE 8: Paper trading — get portfolio
# GET /portfolio
# ─────────────────────────────────────────────────────

@app.get("/portfolio")
def get_portfolio(
    authorization: Optional[str] = Header(None)
):
    import math

    user_id = get_current_user_id(authorization) or 1

    def safe(val, default=0.0):
        try:
            f = float(val)
            return default if math.isnan(f) or math.isinf(f) else round(f, 2)
        except:
            return default

    with engine.connect() as conn:
        holdings = conn.execute(text("""
            SELECT symbol, quantity, avg_buy_price
            FROM   paper_portfolio
            WHERE  quantity > 0 AND user_id = :uid
        """), {"uid": user_id}).fetchall()

        bal = conn.execute(text("""
            SELECT balance FROM paper_wallet
            WHERE  user_id = :uid
        """), {"uid": user_id}).fetchone()

        trades = conn.execute(text("""
            SELECT symbol, action, quantity, price, total, traded_at
            FROM   paper_trades
            WHERE  user_id = :uid
            ORDER  BY traded_at DESC
            LIMIT  20
        """), {"uid": user_id}).fetchall()

    # If no wallet yet create one
    if not bal:
        from user_setup import setup_new_user
        setup_new_user(user_id)
        balance = 100000.0
    else:
        balance = safe(bal[0], 100000.0)

    portfolio  = []
    total_inv  = 0
    total_curr = 0

    for h in holdings:
        symbol   = h[0]
        qty      = int(h[1])
        avg_buy  = safe(h[2])

        with engine.connect() as conn:
            live = conn.execute(text("""
                SELECT price, change_pct FROM live_prices
                WHERE  symbol = :symbol
            """), {"symbol": symbol}).fetchone()

            if not live:
                row = conn.execute(text("""
                    SELECT close FROM stock_prices
                    WHERE  symbol = :symbol
                    ORDER  BY date DESC LIMIT 1
                """), {"symbol": symbol}).fetchone()
                current_price = safe(row[0]) if row else avg_buy
                day_change    = 0.0
            else:
                current_price = safe(live[0], avg_buy)
                day_change    = safe(live[1], 0.0)

        invested    = round(avg_buy * qty,       2)
        current_val = round(current_price * qty, 2)
        pnl         = round(current_val - invested, 2)
        pnl_pct     = round((pnl / invested) * 100, 2) if invested > 0 else 0.0

        total_inv  += invested
        total_curr += current_val

        portfolio.append({
            "symbol":         symbol,
            "quantity":       qty,
            "avg_buy_price":  avg_buy,
            "current_price":  current_price,
            "day_change_pct": day_change,
            "invested":       invested,
            "current_value":  current_val,
            "pnl":            pnl,
            "pnl_pct":        pnl_pct,
            "is_profit":      pnl >= 0,
        })

    total_pnl      = round(total_curr - total_inv,  2)
    total_pnl_pct  = round((total_pnl / total_inv) * 100, 2) \
                     if total_inv > 0 else 0.0
    portfolio_val  = round(balance + total_curr, 2)

    trade_list = [
        {
            "symbol":    t[0],
            "action":    t[1],
            "quantity":  int(t[2]),
            "price":     safe(t[3]),
            "total":     safe(t[4]),
            "traded_at": str(t[5]),
        }
        for t in trades
    ]

    return {
        "balance":         balance,
        "portfolio":       portfolio,
        "total_invested":  round(total_inv,  2),
        "total_current":   round(total_curr, 2),
        "total_pnl":       total_pnl,
        "total_pnl_pct":   total_pnl_pct,
        "portfolio_value": portfolio_val,
        "trades":          trade_list,
    }


# ─────────────────────────────────────────────────────
# ROUTE 9: Paper trading — place order
# POST /order
# ─────────────────────────────────────────────────────

@app.post("/order")
def place_order(
    order: OrderRequest,
    authorization: Optional[str] = Header(None)
):
    user_id  = get_current_user_id(authorization) or 1
    symbol   = order.symbol.upper()
    action   = order.action.upper()
    quantity = order.quantity

    if symbol not in STOCKS:
        raise HTTPException(status_code=404, detail=f"{symbol} not found.")
    if action not in ["BUY", "SELL"]:
        raise HTTPException(status_code=400, detail="Action must be BUY or SELL.")
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")

    # Use live price
    with engine.connect() as conn:
        live = conn.execute(text("""
            SELECT price FROM live_prices
            WHERE  symbol = :symbol
        """), {"symbol": symbol}).fetchone()

        if not live:
            r = conn.execute(text("""
                SELECT close FROM stock_prices
                WHERE  symbol = :symbol
                ORDER  BY date DESC LIMIT 1
            """), {"symbol": symbol}).fetchone()
            price = float(r[0]) if r else 0
        else:
            price = float(live[0])

    total = round(price * quantity, 2)

    with engine.begin() as conn:
        # Ensure wallet exists
        bal = conn.execute(text("""
            SELECT balance FROM paper_wallet
            WHERE  user_id = :uid
        """), {"uid": user_id}).fetchone()

        if not bal:
            from user_setup import setup_new_user
            setup_new_user(user_id)
            balance = 100000.0
        else:
            balance = float(bal[0])

        if action == "BUY":
            if balance < total:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient balance. Need Rs.{total}, have Rs.{round(balance,2)}"
                )

            conn.execute(text("""
                UPDATE paper_wallet
                SET    balance = balance - :total
                WHERE  user_id = :uid
            """), {"total": total, "uid": user_id})

            existing = conn.execute(text("""
                SELECT quantity, avg_buy_price
                FROM   paper_portfolio
                WHERE  symbol = :symbol AND user_id = :uid
            """), {"symbol": symbol, "uid": user_id}).fetchone()

            if existing:
                old_qty = int(existing[0])
                old_avg = float(existing[1])
                new_qty = old_qty + quantity
                new_avg = ((old_avg * old_qty) + (price * quantity)) / new_qty
                conn.execute(text("""
                    UPDATE paper_portfolio
                    SET    quantity = :qty, avg_buy_price = :avg
                    WHERE  symbol = :symbol AND user_id = :uid
                """), {"qty": new_qty, "avg": new_avg,
                       "symbol": symbol, "uid": user_id})
            else:
                conn.execute(text("""
                    INSERT INTO paper_portfolio
                        (symbol, quantity, avg_buy_price, user_id)
                    VALUES (:symbol, :qty, :avg, :uid)
                """), {"symbol": symbol, "qty": quantity,
                       "avg": price, "uid": user_id})

        elif action == "SELL":
            existing = conn.execute(text("""
                SELECT quantity FROM paper_portfolio
                WHERE  symbol = :symbol AND user_id = :uid
            """), {"symbol": symbol, "uid": user_id}).fetchone()

            if not existing or int(existing[0]) < quantity:
                held = int(existing[0]) if existing else 0
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough shares. You hold {held} of {symbol}."
                )

            conn.execute(text("""
                UPDATE paper_wallet
                SET    balance = balance + :total
                WHERE  user_id = :uid
            """), {"total": total, "uid": user_id})

            new_qty = int(existing[0]) - quantity
            conn.execute(text("""
                UPDATE paper_portfolio
                SET    quantity = :qty
                WHERE  symbol = :symbol AND user_id = :uid
            """), {"qty": new_qty, "symbol": symbol, "uid": user_id})

        conn.execute(text("""
            INSERT INTO paper_trades
                (symbol, action, quantity, price, total, user_id)
            VALUES
                (:symbol, :action, :qty, :price, :total, :uid)
        """), {
            "symbol": symbol, "action": action,
            "qty":    quantity, "price":  price,
            "total":  total,    "uid":    user_id,
        })

    return {
        "success":  True,
        "message":  f"{action} order placed successfully.",
        "symbol":   symbol,
        "action":   action,
        "quantity": quantity,
        "price":    price,
        "total":    total,
    }

# ─────────────────────────────────────────────────────
# ROUTE: GET /indicators/{symbol}
# Technical indicators — RSI, MACD, Bollinger Bands
# ─────────────────────────────────────────────────────

@app.get("/indicators/{symbol}")
def get_indicators(symbol: str):
    symbol = symbol.upper()

    if symbol not in STOCKS:
        raise HTTPException(status_code=404, detail=f"{symbol} not found.")

    with engine.connect() as conn:
        df = pd.read_sql(
            text("""
                SELECT date, open, high, low, close, volume
                FROM   stock_prices
                WHERE  symbol = :symbol
                ORDER  BY date ASC
            """),
            conn,
            params={"symbol": symbol}
        )

    if len(df) < 50:
        raise HTTPException(status_code=400,
                            detail="Not enough data for indicators.")

    result = get_all_indicators(df)
    return {"symbol": symbol, **result}


# ─────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────
# ROUTE: GET /news/{symbol}
# Live news from Google News RSS — no API key needed
# ─────────────────────────────────────────────────────

import feedparser
from transformers import pipeline as hf_pipeline

# Load FinBERT once at module level to avoid reloading every request
_sentiment_pipeline = None

def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        _sentiment_pipeline = hf_pipeline(
            "text-classification",
            model="ProsusAI/finbert",
            truncation=True
        )
    return _sentiment_pipeline


def fetch_live_news(company_name: str, symbol: str):
    try:
        import feedparser
        import re

        query         = f"{company_name} stock NSE India"
        query_encoded = query.replace(" ", "+")
        url           = (
            f"https://news.google.com/rss/search"
            f"?q={query_encoded}"
            f"&hl=en-IN&gl=IN&ceid=IN:en"
        )

        feed     = feedparser.parse(url)
        articles = []

        for entry in feed.entries[:8]:
            # Clean title
            title = entry.title
            if " - " in title:
                title = title.rsplit(" - ", 1)[0]

            # Clean description — remove all HTML tags
            raw_desc = entry.get("summary", "") or ""
            clean_desc = re.sub(r'<[^>]+>', '', raw_desc)
            clean_desc = clean_desc.replace("&amp;", "&") \
                                   .replace("&lt;", "<") \
                                   .replace("&gt;", ">") \
                                   .replace("&quot;", '"') \
                                   .replace("&#39;", "'") \
                                   .strip()

            # Get source name
            source = entry.get("source", {}).get("title", "")
            if not source and " - " in entry.title:
                source = entry.title.rsplit(" - ", 1)[-1]

            # Get published date
            published = entry.get("published", "")

            articles.append({
                "headline":     title.strip(),
                "description":  clean_desc[:250] if clean_desc else "",
                "url":          entry.get("link", ""),
                "source":       source,
                "published_at": published,
                "sentiment":    "neutral",
                "score":        0.0,
            })

        return articles

    except Exception as e:
        print(f"   Google News fetch failed: {e}")
        return []


def score_headlines_with_finbert(articles: list):
    """Run FinBERT sentiment on fetched headlines."""
    if not articles:
        return articles, 0.0

    try:
        sentiment_fn = get_sentiment_pipeline()
        scored       = []
        total_score  = 0.0

        for article in articles:
            try:
                result = sentiment_fn(article["headline"][:512])[0]
                label  = result["label"]
                conf   = result["score"]

                if label == "positive":
                    numeric = conf
                elif label == "negative":
                    numeric = -conf
                else:
                    numeric = 0.0

                article["sentiment"] = label
                article["score"]     = round(numeric, 4)
                total_score         += numeric

            except Exception:
                article["sentiment"] = "neutral"
                article["score"]     = 0.0

            scored.append(article)

        avg = round(total_score / len(scored), 4) if scored else 0.0
        return scored, avg

    except Exception as e:
        print(f"   FinBERT scoring failed: {e}")
        return articles, 0.0


@app.get("/news/{symbol}")
def get_news(symbol: str):
    symbol = symbol.upper()

    if symbol not in STOCKS:
        raise HTTPException(
            status_code=404,
            detail=f"{symbol} not found."
        )

    # Company name mapping for better search results
    name_map = {
        "RELIANCE.NS":   "Reliance Industries",
        "TCS.NS":        "Tata Consultancy Services",
        "INFY.NS":       "Infosys",
        "HDFCBANK.NS":   "HDFC Bank",
        "ICICIBANK.NS":  "ICICI Bank",
        "HINDUNILVR.NS": "Hindustan Unilever HUL",
        "BAJFINANCE.NS": "Bajaj Finance",
        "WIPRO.NS":      "Wipro",
        "AXISBANK.NS":   "Axis Bank",
        "KOTAKBANK.NS":  "Kotak Mahindra Bank",
        "MARUTI.NS":     "Maruti Suzuki",
        "SUNPHARMA.NS":  "Sun Pharma",
        "TITAN.NS":      "Titan Company",
        "LTIM.NS":       "LTIMindtree",
        "ADANIENT.NS":   "Adani Enterprises",
    }

    company_name = name_map.get(symbol, symbol.replace(".NS", ""))

    # Fetch live news
    articles = fetch_live_news(company_name, symbol)

    if not articles:
        # Fallback to sample headlines if Google News fails
        fallback = SAMPLE_HEADLINES.get(symbol, [])
        return {
            "symbol":   symbol,
            "articles": fallback,
            "source":   "sample",
            "total":    len(fallback),
        }

    # Score with FinBERT
    scored_articles, avg_sentiment = score_headlines_with_finbert(articles)

    # Overall sentiment
    if avg_sentiment > 0.1:
        overall = "positive"
    elif avg_sentiment < -0.1:
        overall = "negative"
    else:
        overall = "neutral"

    return {
        "symbol":        symbol,
        "company":       company_name,
        "articles":      scored_articles,
        "source":        "live",
        "total":         len(scored_articles),
        "avg_sentiment": avg_sentiment,
        "overall":       overall,
    }

# ─────────────────────────────────────────────────────
# ROUTE: GET /alerts
# Get all price alerts
# ─────────────────────────────────────────────────────

@app.get("/alerts")
def get_alerts(authorization: Optional[str] = Header(None)):
    user_id = get_current_user_id(authorization) or 1

    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, symbol, target_price, condition,
                   note, is_triggered, triggered_at, created_at
            FROM   price_alerts
            WHERE  user_id = :uid
            ORDER  BY created_at DESC
        """), {"uid": user_id}).fetchall()

    alerts = []
    for r in rows:
        with engine.connect() as conn:
            price_row = conn.execute(text("""
                SELECT price FROM live_prices
                WHERE  symbol = :symbol
            """), {"symbol": r[1]}).fetchone()
            if not price_row:
                price_row = conn.execute(text("""
                    SELECT close FROM stock_prices
                    WHERE  symbol = :symbol
                    ORDER  BY date DESC LIMIT 1
                """), {"symbol": r[1]}).fetchone()

        current = round(float(price_row[0]), 2) if price_row else 0

        alerts.append({
            "id":            r[0],
            "symbol":        r[1],
            "target_price":  round(float(r[2]), 2),
            "condition":     r[3],
            "note":          r[4],
            "is_triggered":  r[5],
            "triggered_at":  str(r[6]) if r[6] else None,
            "created_at":    str(r[7]),
            "current_price": current,
            "distance_pct":  round(((float(r[2]) - current) / current) * 100, 2)
                             if current > 0 else 0,
        })

    return {"alerts": alerts, "total": len(alerts)}


# ─────────────────────────────────────────────────────
# ROUTE: POST /alerts
# Create a new price alert
# ─────────────────────────────────────────────────────

@app.post("/alerts")
def create_alert(
    req: AlertRequest,
    authorization: Optional[str] = Header(None)
):
    user_id = get_current_user_id(authorization) or 1
    symbol  = req.symbol.upper()

    if symbol not in STOCKS:
        raise HTTPException(status_code=404, detail=f"{symbol} not found.")
    if req.condition not in ["above", "below"]:
        raise HTTPException(status_code=400,
                            detail="Condition must be 'above' or 'below'.")

    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO price_alerts
                (symbol, target_price, condition, note, user_id)
            VALUES
                (:symbol, :target, :condition, :note, :uid)
            RETURNING id
        """), {
            "symbol":    symbol,
            "target":    req.target_price,
            "condition": req.condition,
            "note":      req.note,
            "uid":       user_id,
        })
        alert_id = result.fetchone()[0]

    return {
        "success":  True,
        "message":  f"Alert created for {symbol} {req.condition} Rs.{req.target_price}",
        "alert_id": alert_id,
    }


# ─────────────────────────────────────────────────────
# ROUTE: DELETE /alerts/{alert_id}
# Delete an alert
# ─────────────────────────────────────────────────────

@app.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int):
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM price_alerts WHERE id = :id"
        ), {"id": alert_id})
    return {"success": True, "message": "Alert deleted."}


# ─────────────────────────────────────────────────────
# ROUTE: GET /watchlist
# Get watchlist
# ─────────────────────────────────────────────────────

@app.get("/watchlist")
def get_watchlist(authorization: Optional[str] = Header(None)):
    user_id = get_current_user_id(authorization) or 1

    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT symbol, added_at FROM watchlist
            WHERE  user_id = :uid
            ORDER  BY added_at DESC
        """), {"uid": user_id}).fetchall()

    watchlist = []
    for r in rows:
        symbol = r[0]
        with engine.connect() as conn:
            live = conn.execute(text("""
                SELECT price, change_pct FROM live_prices
                WHERE  symbol = :symbol
            """), {"symbol": symbol}).fetchone()

        current = float(live[0]) if live else 0
        change  = round(float(live[1]), 2) if live else 0
        pred_row = get_prediction_from_db(symbol)
        confidence = float(pred_row[1]) if pred_row else 0

        watchlist.append({
            "symbol":     symbol,
            "name":       symbol.replace(".NS", ""),
            "price":      round(current, 2),
            "change_pct": change,
            "confidence": confidence,
            "signal":     "BUY" if confidence >= 65
                          else "HOLD" if confidence >= 40
                          else "CAUTION",
            "added_at":   str(r[1]),
        })

    return {"watchlist": watchlist, "total": len(watchlist)}


# ─────────────────────────────────────────────────────
# ROUTE: POST /watchlist
# Add stock to watchlist
# ─────────────────────────────────────────────────────

@app.post("/watchlist")
def add_to_watchlist(
    req: dict,
    authorization: Optional[str] = Header(None)
):
    user_id = get_current_user_id(authorization) or 1
    symbol  = req.get("symbol", "").upper()

    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required.")

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO watchlist (symbol, user_id)
            VALUES (:symbol, :uid)
            ON CONFLICT (user_id, symbol) DO NOTHING
        """), {"symbol": symbol, "uid": user_id})

    return {"success": True, "message": f"{symbol} added to watchlist."}


# ─────────────────────────────────────────────────────
# ROUTE: DELETE /watchlist/{symbol}
# Remove from watchlist
# ─────────────────────────────────────────────────────

@app.delete("/watchlist/{symbol}")
def remove_from_watchlist(
    symbol: str,
    authorization: Optional[str] = Header(None)
):
    user_id = get_current_user_id(authorization) or 1
    symbol  = symbol.upper()

    with engine.begin() as conn:
        conn.execute(text("""
            DELETE FROM watchlist
            WHERE  symbol = :symbol AND user_id = :uid
        """), {"symbol": symbol, "uid": user_id})

    return {"success": True, "message": f"{symbol} removed from watchlist."}

# ─────────────────────────────────────────────────────
# ROUTE: GET /portfolio/analytics
# Portfolio performance analytics
# ─────────────────────────────────────────────────────

@app.get("/portfolio/analytics")
def get_portfolio_analytics(
    authorization: Optional[str] = Header(None)
):
    user_id = get_current_user_id(authorization) or 1

    with engine.connect() as conn:
        trades = conn.execute(text("""
            SELECT symbol, action, quantity, price, total, traded_at
            FROM   paper_trades
            WHERE  user_id = :uid
            ORDER  BY traded_at ASC
        """), {"uid": user_id}).fetchall()

        bal_row = conn.execute(text("""
            SELECT balance FROM paper_wallet
            WHERE  user_id = :uid
        """), {"uid": user_id}).fetchone()

        holdings = conn.execute(text("""
            SELECT symbol, quantity, avg_buy_price
            FROM   paper_portfolio
            WHERE  quantity > 0 AND user_id = :uid
        """), {"uid": user_id}).fetchall()

    balance        = float(bal_row[0]) if bal_row else 100000.0
    starting_bal   = 100000.0
    total_trades   = len(trades)
    buy_trades     = sum(1 for t in trades if t[1] == "BUY")
    sell_trades    = sum(1 for t in trades if t[1] == "SELL")
    total_invested = sum(float(t[4]) for t in trades if t[1] == "BUY")
    total_returned = sum(float(t[4]) for t in trades if t[1] == "SELL")

    current_value = balance
    for h in holdings:
        with engine.connect() as conn:
            live = conn.execute(text("""
                SELECT price FROM live_prices
                WHERE  symbol = :symbol
            """), {"symbol": h[0]}).fetchone()
        if live:
            current_value += float(live[0]) * int(h[1])

    total_pnl     = round(current_value - starting_bal, 2)
    total_pnl_pct = round((total_pnl / starting_bal) * 100, 2)

    symbol_stats = {}
    for t in trades:
        sym = t[0]
        if sym not in symbol_stats:
            symbol_stats[sym] = {"invested": 0, "returned": 0, "trades": 0}
        if t[1] == "BUY":
            symbol_stats[sym]["invested"] += float(t[4])
        else:
            symbol_stats[sym]["returned"] += float(t[4])
        symbol_stats[sym]["trades"] += 1

    breakdown = [
        {
            "symbol":   sym,
            "invested": round(v["invested"], 2),
            "returned": round(v["returned"], 2),
            "pnl":      round(v["returned"] - v["invested"], 2),
            "trades":   v["trades"],
        }
        for sym, v in symbol_stats.items()
    ]

    allocation = []
    for h in holdings:
        with engine.connect() as conn:
            live = conn.execute(text("""
                SELECT price FROM live_prices
                WHERE  symbol = :symbol
            """), {"symbol": h[0]}).fetchone()
        if live:
            val = float(live[0]) * int(h[1])
            pct = round((val / current_value) * 100, 1) if current_value > 0 else 0
            allocation.append({
                "symbol": h[0].replace(".NS", ""),
                "value":  round(val, 2),
                "pct":    pct,
            })

    cash_pct = round((balance / current_value) * 100, 1) if current_value > 0 else 100
    allocation.append({"symbol": "Cash", "value": round(balance, 2), "pct": cash_pct})

    return {
        "summary": {
            "starting_balance": starting_bal,
            "current_value":    round(current_value, 2),
            "cash_balance":     round(balance, 2),
            "total_pnl":        total_pnl,
            "total_pnl_pct":    total_pnl_pct,
            "total_trades":     total_trades,
            "buy_trades":       buy_trades,
            "sell_trades":      sell_trades,
            "total_invested":   round(total_invested, 2),
            "total_returned":   round(total_returned, 2),
        },
        "breakdown":  breakdown,
        "allocation": allocation,
    }

# ─────────────────────────────────────────────────────
# ROUTE: GET /live-prices
# Returns all live simulated prices
# ─────────────────────────────────────────────────────

@app.get("/live-prices")
def get_all_live_prices():
    prices = get_live_prices()
    if not prices:
        raise HTTPException(status_code=404,
                            detail="No live prices found. Restart server.")
    return {"prices": prices, "count": len(prices)}


# ─────────────────────────────────────────────────────
# ROUTE: GET /live-price/{symbol}
# Returns live price for one stock
# ─────────────────────────────────────────────────────

@app.get("/live-price/{symbol}")
def get_one_live_price(symbol: str):
    symbol = symbol.upper()
    price  = get_live_price(symbol)
    if not price:
        raise HTTPException(status_code=404,
                            detail=f"No live price for {symbol}.")
    return price


# ─────────────────────────────────────────────────────
# ROUTE: GET /portfolio/live-pnl
# Calculates real-time P&L using live prices
# ─────────────────────────────────────────────────────

@app.get("/portfolio/live-pnl")
def get_live_pnl():
    with engine.connect() as conn:
        holdings = conn.execute(text("""
            SELECT symbol, quantity, avg_buy_price
            FROM   paper_portfolio
            WHERE  quantity > 0
        """)).fetchall()

        bal_row = conn.execute(text(
            "SELECT balance FROM paper_wallet LIMIT 1"
        )).fetchone()

    balance      = float(bal_row[0]) if bal_row else 100000.0
    starting_bal = 100000.0

    positions    = []
    total_invest = 0
    total_curr   = 0

    for h in holdings:
        symbol       = h[0]
        qty          = int(h[1])
        avg_buy      = float(h[2])

        # Use live price
        live         = get_live_price(symbol)
        current_price = float(live["price"]) if live else avg_buy

        invested     = round(avg_buy * qty,      2)
        current_val  = round(current_price * qty, 2)
        pnl          = round(current_val - invested, 2)
        pnl_pct      = round((pnl / invested) * 100, 2) if invested > 0 else 0
        day_change   = round(float(live["change_pct"]) if live else 0, 2)

        total_invest += invested
        total_curr   += current_val

        positions.append({
            "symbol":        symbol,
            "name":          symbol.replace(".NS", ""),
            "quantity":      qty,
            "avg_buy_price": round(avg_buy,       2),
            "current_price": round(current_price, 2),
            "invested":      invested,
            "current_value": current_val,
            "pnl":           pnl,
            "pnl_pct":       pnl_pct,
            "day_change_pct": day_change,
            "is_profit":     pnl >= 0,
        })

    total_pnl       = round(total_curr - total_invest, 2)
    total_pnl_pct   = round((total_pnl / total_invest) * 100, 2) \
                      if total_invest > 0 else 0
    portfolio_value = round(balance + total_curr, 2)
    overall_pnl     = round(portfolio_value - starting_bal, 2)
    overall_pnl_pct = round((overall_pnl / starting_bal) * 100, 2)

    return {
        "positions":       positions,
        "balance":         round(balance, 2),
        "total_invested":  round(total_invest, 2),
        "total_current":   round(total_curr, 2),
        "total_pnl":       total_pnl,
        "total_pnl_pct":   total_pnl_pct,
        "portfolio_value": portfolio_value,
        "overall_pnl":     overall_pnl,
        "overall_pnl_pct": overall_pnl_pct,
        "starting_balance": starting_bal,
    }

# ─────────────────────────────────────────────────────
# ROUTE: GET /bot/config
# ─────────────────────────────────────────────────────

@app.get("/bot/config")
def get_bot_config_route():
    config = get_bot_config()
    if not config:
        raise HTTPException(status_code=404, detail="Bot config not found.")
    return config


# ─────────────────────────────────────────────────────
# ROUTE: POST /bot/config
# Update bot settings
# ─────────────────────────────────────────────────────

@app.post("/bot/config")
def update_bot_config_route(updates: dict):
    update_bot_config(updates)
    return {"success": True, "message": "Bot config updated.",
            "config": get_bot_config()}


# ─────────────────────────────────────────────────────
# ROUTE: POST /bot/toggle
# Start or stop the bot
# ─────────────────────────────────────────────────────

@app.post("/bot/toggle")
def toggle_bot():
    config = get_bot_config()
    new_state = not config["is_active"]
    update_bot_config({"is_active": new_state})
    status = "started" if new_state else "stopped"
    return {
        "success":   True,
        "is_active": new_state,
        "message":   f"Bot {status} successfully.",
    }


# ─────────────────────────────────────────────────────
# ROUTE: GET /bot/trades
# ─────────────────────────────────────────────────────

@app.get("/bot/trades")
def get_bot_trades_route():
    trades = get_bot_trades(50)
    return {"trades": trades, "total": len(trades)}


# ─────────────────────────────────────────────────────
# ROUTE: GET /bot/logs
# ─────────────────────────────────────────────────────

@app.get("/bot/logs")
def get_bot_logs_route():
    logs = get_bot_logs(30)
    return {"logs": logs}


# ─────────────────────────────────────────────────────
# ROUTE: POST /bot/run-now
# Manually trigger one bot tick
# ─────────────────────────────────────────────────────

@app.post("/bot/run-now")
def run_bot_now():
    run_bot_tick()
    trades = get_bot_trades(5)
    return {
        "success": True,
        "message": "Bot tick executed.",
        "recent_trades": trades,
    }

    # ─────────────────────────────────────────────────────
# ROUTE: GET /settings/profile
# ─────────────────────────────────────────────────────

@app.get("/settings/profile")
def get_profile(authorization: Optional[str] = Header(None)):
    user_id = get_current_user_id(authorization) or 1
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT email, phone, full_name, auth_provider,
                   is_verified, two_fa_enabled, created_at
            FROM   users WHERE id = :uid
        """), {"uid": user_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "email":          row[0],
        "phone":          row[1],
        "full_name":      row[2],
        "auth_provider":  row[3],
        "is_verified":    row[4],
        "two_fa_enabled": row[5],
        "created_at":     str(row[6]),
    }


# ─────────────────────────────────────────────────────
# ROUTE: POST /settings/profile
# ─────────────────────────────────────────────────────

@app.post("/settings/profile")
def update_profile(
    req: dict,
    authorization: Optional[str] = Header(None)
):
    user_id = get_current_user_id(authorization) or 1
    allowed = ["full_name", "phone"]
    updates = {k: v for k, v in req.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update.")
    set_clause = ", ".join([f"{k} = :{k}" for k in updates])
    updates["uid"] = user_id
    with engine.begin() as conn:
        conn.execute(text(f"""
            UPDATE users SET {set_clause} WHERE id = :uid
        """), updates)
    return {"success": True, "message": "Profile updated."}


# ─────────────────────────────────────────────────────
# ROUTE: POST /settings/change-password
# ─────────────────────────────────────────────────────

@app.post("/settings/change-password")
def change_password(
    req: dict,
    authorization: Optional[str] = Header(None)
):
    user_id      = get_current_user_id(authorization) or 1
    current_pass = req.get("current_password", "")
    new_pass     = req.get("new_password", "")

    if len(new_pass) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters."
        )

    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT hashed_password FROM users WHERE id = :uid"
        ), {"uid": user_id}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found.")

    from auth_utils import verify_password, hash_password
    if not verify_password(current_pass, row[0]):
        raise HTTPException(
            status_code=400, detail="Current password is incorrect."
        )

    new_hashed = hash_password(new_pass)
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE users SET hashed_password = :pwd WHERE id = :uid
        """), {"pwd": new_hashed, "uid": user_id})

    return {"success": True, "message": "Password changed successfully."}


# ─────────────────────────────────────────────────────
# ROUTE: POST /settings/toggle-2fa
# ─────────────────────────────────────────────────────

@app.post("/settings/toggle-2fa")
def toggle_2fa(authorization: Optional[str] = Header(None)):
    user_id = get_current_user_id(authorization) or 1
    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT two_fa_enabled FROM users WHERE id = :uid"
        ), {"uid": user_id}).fetchone()
    new_val = not row[0]
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE users SET two_fa_enabled = :val WHERE id = :uid
        """), {"val": new_val, "uid": user_id})
    return {
        "success":       True,
        "two_fa_enabled": new_val,
        "message":       f"2FA {'enabled' if new_val else 'disabled'}.",
    }


# ─────────────────────────────────────────────────────
# ROUTE: POST /settings/reset-portfolio
# ─────────────────────────────────────────────────────

@app.post("/settings/reset-portfolio")
def reset_portfolio(authorization: Optional[str] = Header(None)):
    user_id = get_current_user_id(authorization) or 1
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE paper_wallet SET balance = 100000
            WHERE  user_id = :uid
        """), {"uid": user_id})
        conn.execute(text("""
            DELETE FROM paper_portfolio WHERE user_id = :uid
        """), {"uid": user_id})
        conn.execute(text("""
            DELETE FROM paper_trades WHERE user_id = :uid
        """), {"uid": user_id})
    return {"success": True, "message": "Portfolio reset to ₹1,00,000."}


# ─────────────────────────────────────────────────────
# ROUTE: POST /settings/clear-watchlist
# ─────────────────────────────────────────────────────

@app.post("/settings/clear-watchlist")
def clear_watchlist(authorization: Optional[str] = Header(None)):
    user_id = get_current_user_id(authorization) or 1
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM watchlist WHERE user_id = :uid"
        ), {"uid": user_id})
    return {"success": True, "message": "Watchlist cleared."}


# ─────────────────────────────────────────────────────
# ROUTE: POST /settings/clear-alerts
# ─────────────────────────────────────────────────────

@app.post("/settings/clear-alerts")
def clear_alerts(authorization: Optional[str] = Header(None)):
    user_id = get_current_user_id(authorization) or 1
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM price_alerts WHERE user_id = :uid"
        ), {"uid": user_id})
    return {"success": True, "message": "All alerts cleared."}