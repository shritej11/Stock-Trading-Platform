# train_model.py
# NeuroTrade - Day 2
# Trains LSTM model, runs FinBERT sentiment, computes confidence score
# Run with: python train_model.py

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import warnings
import os
warnings.filterwarnings("ignore")

from sqlalchemy import create_engine, text
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error

from config import DATABASE_URL, STOCKS


# ─────────────────────────────────────────────────────
# STEP 1: Load stock data from PostgreSQL
# ─────────────────────────────────────────────────────

def load_stock_data(engine, symbol):
    print(f"\n   Loading {symbol} from database...")
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
    print(f"   Loaded {len(df)} rows.")
    return df


# ─────────────────────────────────────────────────────
# STEP 2: Prepare data for LSTM
# ─────────────────────────────────────────────────────

def prepare_data(df, lookback=60):
    """
    lookback = how many past days the model looks at
    to predict the next day's price.
    60 days is standard for stock prediction.
    """
    prices = df["close"].values.reshape(-1, 1)

    # Scale prices to 0-1 range (LSTM works better with small numbers)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled = scaler.fit_transform(prices)

    X, y = [], []
    for i in range(lookback, len(scaled)):
        X.append(scaled[i - lookback:i, 0])  # last 60 days
        y.append(scaled[i, 0])               # next day price

    X = np.array(X)
    y = np.array(y)

    # Reshape X for LSTM: (samples, timesteps, features)
    X = X.reshape((X.shape[0], X.shape[1], 1))

    # 80% train, 20% test
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    print(f"   Training samples : {len(X_train)}")
    print(f"   Testing samples  : {len(X_test)}")

    return X_train, X_test, y_train, y_test, scaler


# ─────────────────────────────────────────────────────
# STEP 3: Build and train the LSTM model
# ─────────────────────────────────────────────────────

def build_and_train(X_train, y_train, symbol):
    # Import TensorFlow here so startup is faster
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import EarlyStopping

    print(f"\n   Building LSTM model for {symbol}...")

    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(X_train.shape[1], 1)),
        Dropout(0.2),
        LSTM(32, return_sequences=False),
        Dropout(0.2),
        Dense(16),
        Dense(1)   # output: next day's price
    ])

    model.compile(optimizer="adam", loss="mean_squared_error")

    print(f"   Training... (this may take 1-2 minutes)")

    early_stop = EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True
    )

    history = model.fit(
        X_train, y_train,
        epochs=50,
        batch_size=32,
        validation_split=0.1,
        callbacks=[early_stop],
        verbose=0   # set to 1 if you want to see each epoch
    )

    final_loss = history.history["val_loss"][-1]
    print(f"   Training complete. Final val_loss: {final_loss:.6f}")

    return model


# ─────────────────────────────────────────────────────
# STEP 4: Evaluate and predict
# ─────────────────────────────────────────────────────

def evaluate_model(model, X_test, y_test, scaler, df, symbol):
    print(f"\n   Evaluating model for {symbol}...")

    # Make predictions on test data
    predictions_scaled = model.predict(X_test, verbose=0)

    # Convert back to real price values
    predictions = scaler.inverse_transform(predictions_scaled)
    actual       = scaler.inverse_transform(y_test.reshape(-1, 1))

    mae  = mean_absolute_error(actual, predictions)
    rmse = np.sqrt(mean_squared_error(actual, predictions))

    print(f"   MAE  (avg error in Rs.) : Rs.{mae:.2f}")
    print(f"   RMSE                    : Rs.{rmse:.2f}")

    # Predict NEXT day's price (the one after all our data)
    last_60_days = scaler.transform(
        df["close"].values[-60:].reshape(-1, 1)
    )
    next_input = last_60_days.reshape(1, 60, 1)
    next_price_scaled = model.predict(next_input, verbose=0)
    next_price = scaler.inverse_transform(next_price_scaled)[0][0]

    current_price = float(df["close"].values[-1])
    change_pct    = ((next_price - current_price) / current_price) * 100

    print(f"\n   Current price  : Rs.{current_price:.2f}")
    print(f"   Predicted next : Rs.{next_price:.2f}  ({change_pct:+.2f}%)")

    # Price signal: how confident is the price model (0 to 1)
    # Based on prediction direction and RMSE relative to price
    price_signal = max(0, min(1, 1 - (rmse / current_price)))

    return predictions, actual, next_price, price_signal, mae, rmse


# ─────────────────────────────────────────────────────
# STEP 5: Save prediction chart
# ─────────────────────────────────────────────────────

def save_chart(predictions, actual, symbol):
    os.makedirs("charts", exist_ok=True)
    path = f"charts/{symbol.replace('.', '_')}_prediction.png"

    plt.figure(figsize=(12, 5))
    plt.plot(actual,      label="Actual Price",    color="#378ADD", linewidth=1.5)
    plt.plot(predictions, label="Predicted Price", color="#EF9F27",
             linewidth=1.5, linestyle="--")
    plt.title(f"{symbol} — Actual vs Predicted Price")
    plt.xlabel("Days")
    plt.ylabel("Price (Rs.)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(path)
    plt.close()
    print(f"   Chart saved → {path}")


# ─────────────────────────────────────────────────────
# STEP 6: Save trained model to disk
# ─────────────────────────────────────────────────────

def save_model(model, symbol):
    os.makedirs("models", exist_ok=True)
    clean = symbol.replace(".", "_")
    path  = f"models/lstm_{clean}.h5"
    model.save(path)
    print(f"   Model saved  → {path}")


# ─────────────────────────────────────────────────────
# STEP 7: FinBERT sentiment on sample headlines
# ─────────────────────────────────────────────────────

# Realistic sample headlines for each stock
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


def run_sentiment(symbol):
    print(f"\n   Running FinBERT sentiment for {symbol}...")

    try:
        from transformers import pipeline

        # Get headlines for this symbol
        headlines_data = SAMPLE_HEADLINES.get(symbol)

        if not headlines_data:
            print(f"   No headlines found for {symbol}, using neutral sentiment.")
            return [], 0.0

        sentiment_pipeline = pipeline(
            "text-classification",
            model="ProsusAI/finbert",
            truncation=True
        )

        results = []
        for item in headlines_data:
            headline = item["headline"]
            output   = sentiment_pipeline(headline)[0]
            label    = output["label"]
            score    = output["score"]

            if label == "positive":
                numeric = score
            elif label == "negative":
                numeric = -score
            else:
                numeric = 0.0

            results.append({
                "headline":  headline,
                "sentiment": label,
                "score":     round(numeric, 4)
            })
            print(f"   {label.upper():<9} ({score:.2f})  {headline[:55]}...")

        scores = [r["score"] for r in results]
        avg_sentiment = float(np.mean(scores)) if scores else 0.0
        print(f"\n   Average sentiment score: {avg_sentiment:.4f}")
        return results, avg_sentiment

    except Exception as e:
        print(f"   WARNING: FinBERT failed ({e})")
        print(f"   Using neutral sentiment as fallback.")
        return [], 0.0


# ─────────────────────────────────────────────────────
# STEP 8: Compute confidence score
# ─────────────────────────────────────────────────────

def compute_confidence(price_signal, avg_sentiment):
    """
    Combines price model signal and sentiment into 0-100 score.
    Formula: 60% weight on price prediction, 40% on sentiment.
    """
    # Normalize sentiment from (-1, +1) to (0, 1)
    sentiment_normalized = (avg_sentiment + 1) / 2

    raw_score  = (0.6 * price_signal) + (0.4 * sentiment_normalized)
    confidence = round(raw_score * 100, 2)

    if confidence >= 65:
        signal = "BUY"
        color  = "GREEN"
    elif confidence >= 40:
        signal = "HOLD"
        color  = "AMBER"
    else:
        signal = "CAUTION"
        color  = "RED"

    return confidence, signal, color


# ─────────────────────────────────────────────────────
# STEP 9: Save results to PostgreSQL
# ─────────────────────────────────────────────────────

def save_prediction(engine, symbol, next_price,
                    confidence, price_signal, avg_sentiment):
    import math
    from datetime import date

    # Fix nan values before saving
    if math.isnan(avg_sentiment) or math.isinf(avg_sentiment):
        avg_sentiment = 0.0
    if math.isnan(confidence) or math.isinf(confidence):
        confidence = 50.0
    if math.isnan(price_signal) or math.isinf(price_signal):
        price_signal = 0.5

    today = date.today()
    # ... rest of function unchanged

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO predictions
                (symbol, prediction_date, predicted_price,
                 confidence_score, sentiment_score, price_signal)
            VALUES
                (:symbol, :date, :predicted_price,
                 :confidence, :sentiment, :price_signal)
            ON CONFLICT (symbol, prediction_date) DO UPDATE
                SET predicted_price  = EXCLUDED.predicted_price,
                    confidence_score = EXCLUDED.confidence_score,
                    sentiment_score  = EXCLUDED.sentiment_score,
                    price_signal     = EXCLUDED.price_signal
        """), {
            "symbol":          symbol,
            "date":            today,
            "predicted_price": round(float(next_price), 4),
            "confidence":      float(confidence),
            "sentiment":       round(float(avg_sentiment), 4),
            "price_signal":    round(float(price_signal), 4),
        })
    print(f"   Prediction saved to database.")


# ─────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("   NeuroTrade AI — Day 2: Train Models")
    print("=" * 55)

    engine = create_engine(DATABASE_URL)

    all_results = []

    for symbol in STOCKS:
        print(f"\n{'─'*55}")
        print(f"   Processing {symbol}")
        print(f"{'─'*55}")

        # Load data
        df = load_stock_data(engine, symbol)

        # Prepare for LSTM
        X_train, X_test, y_train, y_test, scaler = prepare_data(df)

        # Train model
        model = build_and_train(X_train, y_train, symbol)

        # Evaluate + predict next price
        predictions, actual, next_price, price_signal, mae, rmse = \
            evaluate_model(model, X_test, y_test, scaler, df, symbol)

        # Save chart and model
        save_chart(predictions, actual, symbol)
        save_model(model, symbol)

        # Sentiment analysis
        sentiment_results, avg_sentiment = run_sentiment(symbol)

        # Confidence score
        confidence, signal, color = compute_confidence(
            price_signal, avg_sentiment
        )

        # Save to database
        save_prediction(engine, symbol, next_price,
                        confidence, price_signal, avg_sentiment)

        all_results.append({
            "symbol":     symbol,
            "next_price": next_price,
            "confidence": confidence,
            "signal":     signal,
            "color":      color,
            "mae":        mae,
        })

    # ── Final Summary ──────────────────────────────
    print(f"\n{'='*55}")
    print(f"   NEUROTRADE — PREDICTION SUMMARY")
    print(f"{'='*55}")
    print(f"   {'Symbol':<15} {'Predicted':>10} {'Confidence':>12} {'Signal'}")
    print(f"   {'-'*50}")
    for r in all_results:
        print(
            f"   {r['symbol']:<15}"
            f" Rs.{r['next_price']:>8.2f}"
            f"   {r['confidence']:>5.1f}/100"
            f"   {r['signal']} ({r['color']})"
        )

    print(f"\n   Charts saved in → ml-service/charts/")
    print(f"   Models saved in → ml-service/models/")
    print(f"{'='*55}")
    print(f"   Day 2 Complete!")
    print(f"   Next: run api_server.py for Day 3")
    print(f"{'='*55}")