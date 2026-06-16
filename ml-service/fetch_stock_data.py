# fetch_stock_data.py
# NeuroTrade - Day 1
# Fetches 2 years of NSE stock data and saves it to PostgreSQL
# Run with: python fetch_stock_data.py

import yfinance as yf
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import sys

from config import DATABASE_URL, STOCKS, YEARS_OF_DATA


# ─────────────────────────────────────────────────────
# STEP 1: Connect to PostgreSQL
# ─────────────────────────────────────────────────────

def connect_db():
    print("\n[1/4] Connecting to PostgreSQL...")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("      Connected successfully.")
        return engine
    except Exception as e:
        print(f"\n      ERROR: Could not connect to PostgreSQL.")
        print(f"      Make sure PostgreSQL is running and your")
        print(f"      password in config.py is correct.")
        print(f"      Details: {e}")
        sys.exit(1)


# ─────────────────────────────────────────────────────
# STEP 2: Create tables in the database
# ─────────────────────────────────────────────────────

def create_tables(engine):
    print("\n[2/4] Creating database tables...")

    create_stock_prices = """
    CREATE TABLE IF NOT EXISTS stock_prices (
        id          SERIAL PRIMARY KEY,
        symbol      VARCHAR(20)   NOT NULL,
        date        DATE          NOT NULL,
        open        NUMERIC(12,4),
        high        NUMERIC(12,4),
        low         NUMERIC(12,4),
        close       NUMERIC(12,4),
        volume      BIGINT,
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE (symbol, date)
    );
    """

    create_predictions = """
    CREATE TABLE IF NOT EXISTS predictions (
        id               SERIAL PRIMARY KEY,
        symbol           VARCHAR(20)   NOT NULL,
        prediction_date  DATE          NOT NULL,
        predicted_price  NUMERIC(12,4),
        actual_price     NUMERIC(12,4),
        confidence_score NUMERIC(5,2),
        sentiment_score  NUMERIC(5,4),
        price_signal     NUMERIC(5,4),
        created_at       TIMESTAMP DEFAULT NOW(),
        UNIQUE (symbol, prediction_date)
    );
    """

    create_news = """
    CREATE TABLE IF NOT EXISTS news_headlines (
        id              SERIAL PRIMARY KEY,
        symbol          VARCHAR(20)   NOT NULL,
        headline        TEXT          NOT NULL,
        sentiment       VARCHAR(10),
        sentiment_score NUMERIC(6,4),
        published_at    TIMESTAMP,
        created_at      TIMESTAMP DEFAULT NOW()
    );
    """

    with engine.begin() as conn:
        conn.execute(text(create_stock_prices))
        conn.execute(text(create_predictions))
        conn.execute(text(create_news))

    print("      Tables created:")
    print("      - stock_prices")
    print("      - predictions")
    print("      - news_headlines")


# ─────────────────────────────────────────────────────
# STEP 3: Download stock data from Yahoo Finance
# ─────────────────────────────────────────────────────

def fetch_stock_data(symbol, years=2):
    end_date   = datetime.today()
    start_date = end_date - timedelta(days=years * 365)

    print(f"\n      Downloading {symbol}...")
    print(f"      Period: {start_date.date()} to {end_date.date()}")

    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(start=start_date, end=end_date)

        if df.empty:
            print(f"      WARNING: No data returned for {symbol}. Skipping.")
            return None

        # Flatten the dataframe
        df = df.reset_index()

        # Rename columns to match our database
        df = df.rename(columns={
            "Date":   "date",
            "Open":   "open",
            "High":   "high",
            "Low":    "low",
            "Close":  "close",
            "Volume": "volume"
        })

        # Keep only what we need
        df = df[["date", "open", "high", "low", "close", "volume"]]

        # Remove timezone from date column
        df["date"] = pd.to_datetime(df["date"]).dt.date

        # Add symbol column
        df["symbol"] = symbol

        print(f"      Downloaded {len(df)} rows of data.")
        return df

    except Exception as e:
        print(f"      ERROR fetching {symbol}: {e}")
        return None


# ─────────────────────────────────────────────────────
# STEP 4: Save downloaded data to PostgreSQL
# ─────────────────────────────────────────────────────

def save_to_db(engine, df, symbol):
    inserted = 0
    skipped  = 0

    with engine.begin() as conn:
        for _, row in df.iterrows():
            try:
                conn.execute(text("""
                    INSERT INTO stock_prices
                        (symbol, date, open, high, low, close, volume)
                    VALUES
                        (:symbol, :date, :open, :high, :low, :close, :volume)
                    ON CONFLICT (symbol, date) DO NOTHING
                """), {
                    "symbol": row["symbol"],
                    "date":   row["date"],
                    "open":   float(row["open"]),
                    "high":   float(row["high"]),
                    "low":    float(row["low"]),
                    "close":  float(row["close"]),
                    "volume": int(row["volume"]),
                })
                inserted += 1
            except Exception:
                skipped += 1

    print(f"      Saved {inserted} rows ({skipped} duplicates skipped).")


# ─────────────────────────────────────────────────────
# STEP 5: Verify data was saved correctly
# ─────────────────────────────────────────────────────

def verify_data(engine):
    print("\n[4/4] Verifying saved data...\n")

    with engine.connect() as conn:

        # Summary per stock
        result = conn.execute(text("""
            SELECT
                symbol,
                MIN(date)                     AS from_date,
                MAX(date)                     AS to_date,
                COUNT(*)                      AS total_rows,
                ROUND(AVG(close)::numeric, 2) AS avg_close
            FROM  stock_prices
            GROUP BY symbol
            ORDER BY symbol
        """))
        rows = result.fetchall()

        if not rows:
            print("   No data found. Something went wrong.")
            return

        print(f"   {'Symbol':<15} {'From':<13} {'To':<13} {'Rows':<8} Avg Close")
        print(f"   {'-'*60}")
        for row in rows:
            print(f"   {row[0]:<15} {str(row[1]):<13} {str(row[2]):<13} {row[3]:<8} Rs.{row[4]}")

        # Show last 3 rows for RELIANCE
        print(f"\n   Last 3 entries for RELIANCE.NS:")
        result2 = conn.execute(text("""
            SELECT date, open, high, low, close, volume
            FROM   stock_prices
            WHERE  symbol = 'RELIANCE.NS'
            ORDER  BY date DESC
            LIMIT  3
        """))
        recent = result2.fetchall()

        print(f"   {'Date':<13} {'Open':>9} {'High':>9} {'Low':>9} {'Close':>9} {'Volume':>12}")
        print(f"   {'-'*65}")
        for r in recent:
            print(
                f"   {str(r[0]):<13}"
                f" {float(r[1]):>9.2f}"
                f" {float(r[2]):>9.2f}"
                f" {float(r[3]):>9.2f}"
                f" {float(r[4]):>9.2f}"
                f" {int(r[5]):>12,}"
            )


# ─────────────────────────────────────────────────────
# MAIN — runs all steps in order
# ─────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("   NeuroTrade AI — Day 1: Fetch Stock Data")
    print("=" * 55)

    engine = connect_db()
    create_tables(engine)

    print("\n[3/4] Downloading NSE stock data...")
    for symbol in STOCKS:
        df = fetch_stock_data(symbol, YEARS_OF_DATA)
        if df is not None:
            save_to_db(engine, df, symbol)

    verify_data(engine)

    print("\n" + "=" * 55)
    print("   Day 1 Complete!")
    print("   Open pgAdmin4 and check the stock_prices table.")
    print("   You should see ~490 rows per stock.")
    print("   Next: run train_model.py for Day 2")
    print("=" * 55)