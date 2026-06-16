# stock_simulator.py
# Simulates real-time stock price fluctuation
# Prices move randomly but realistically based on volatility

import random
import math
from datetime import datetime
from sqlalchemy import create_engine, text
from config import DATABASE_URL

engine = create_engine(DATABASE_URL)

# Volatility settings per stock (% max move per tick)
VOLATILITY = {
    "RELIANCE.NS":   0.008,
    "TCS.NS":        0.010,
    "INFY.NS":       0.012,
    "HDFCBANK.NS":   0.009,
    "ICICIBANK.NS":  0.011,
    "HINDUNILVR.NS": 0.007,
    "BAJFINANCE.NS": 0.013,
    "WIPRO.NS":      0.011,
    "AXISBANK.NS":   0.012,
    "KOTAKBANK.NS":  0.009,
    "MARUTI.NS":     0.010,
    "SUNPHARMA.NS":  0.009,
    "TITAN.NS":      0.011,
    "LTIM.NS":       0.012,
    "ADANIENT.NS":   0.015,
}

# Trend bias — slightly positive overall like real markets
TREND_BIAS = 0.0002  # 0.02% upward drift per tick


def create_simulator_tables():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS live_prices (
                id           SERIAL PRIMARY KEY,
                symbol       VARCHAR(20)  NOT NULL,
                price        NUMERIC(12,4) NOT NULL,
                open_price   NUMERIC(12,4),
                high_price   NUMERIC(12,4),
                low_price    NUMERIC(12,4),
                prev_close   NUMERIC(12,4),
                change_amt   NUMERIC(12,4),
                change_pct   NUMERIC(8,4),
                volume       BIGINT DEFAULT 0,
                updated_at   TIMESTAMP DEFAULT NOW(),
                UNIQUE (symbol)
            );
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS price_history_live (
                id         SERIAL PRIMARY KEY,
                symbol     VARCHAR(20)   NOT NULL,
                price      NUMERIC(12,4) NOT NULL,
                volume     INTEGER       DEFAULT 0,
                recorded_at TIMESTAMP   DEFAULT NOW()
            );
        """))
    print("   Simulator tables created.")


def initialize_prices():
    """Seed live_prices with latest closing prices from stock_prices table."""
    with engine.connect() as conn:
        for symbol in VOLATILITY.keys():
            row = conn.execute(text("""
                SELECT close FROM stock_prices
                WHERE  symbol = :symbol
                ORDER  BY date DESC LIMIT 1
            """), {"symbol": symbol}).fetchone()

            if not row:
                continue

            price = float(row[0])

            existing = conn.execute(text(
                "SELECT id FROM live_prices WHERE symbol = :symbol"
            ), {"symbol": symbol}).fetchone()

            if not existing:
                with engine.begin() as c:
                    c.execute(text("""
                        INSERT INTO live_prices
                            (symbol, price, open_price, high_price,
                             low_price, prev_close, change_amt, change_pct)
                        VALUES
                            (:symbol, :price, :price, :price,
                             :price, :price, 0, 0)
                    """), {"symbol": symbol, "price": price})
                print(f"   Initialized {symbol} at Rs.{price:.2f}")


def tick():
    """
    One price tick — moves all stock prices randomly.
    Called every few seconds by the scheduler.
    """
    now = datetime.utcnow()
    is_market_hours = 4 <= now.hour <= 10  # 9:30AM-4PM IST in UTC

    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT symbol, price, open_price, high_price,
                   low_price, prev_close
            FROM   live_prices
        """)).fetchall()

    for row in rows:
        symbol, price, open_p, high_p, low_p, prev_close = row
        price      = float(price)
        open_p     = float(open_p)
        high_p     = float(high_p)
        low_p      = float(low_p)
        prev_close = float(prev_close)

        vol = VOLATILITY.get(symbol, 0.01)

        # Generate random return using geometric brownian motion
        random_move = random.gauss(TREND_BIAS, vol)

        # Add occasional news-like spikes (1% chance of 2x move)
        if random.random() < 0.01:
            random_move *= random.choice([-2.5, 2.5])

        # Calculate new price
        new_price = price * math.exp(random_move)

        # Keep price within realistic bounds (±15% from prev_close)
        max_price = prev_close * 1.15
        min_price = prev_close * 0.85
        new_price = max(min(new_price, max_price), min_price)
        new_price = round(new_price, 2)

        # Update high/low
        new_high = max(high_p, new_price)
        new_low  = min(low_p,  new_price)

        # Calculate change from previous close
        change_amt = round(new_price - prev_close, 2)
        change_pct = round((change_amt / prev_close) * 100, 4)

        # Random volume spike
        volume = random.randint(1000, 50000)

        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE live_prices
                SET    price      = :price,
                       high_price = :high,
                       low_price  = :low,
                       change_amt = :change_amt,
                       change_pct = :change_pct,
                       volume     = volume + :volume,
                       updated_at = NOW()
                WHERE  symbol = :symbol
            """), {
                "price":      new_price,
                "high":       new_high,
                "low":        new_low,
                "change_amt": change_amt,
                "change_pct": change_pct,
                "volume":     volume,
                "symbol":     symbol,
            })

            # Save to history
            conn.execute(text("""
                INSERT INTO price_history_live
                    (symbol, price, volume)
                VALUES
                    (:symbol, :price, :volume)
            """), {
                "symbol": symbol,
                "price":  new_price,
                "volume": volume,
            })


def reset_daily():
    """Reset open price and prev_close at start of day."""
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE live_prices
            SET    prev_close = price,
                   open_price = price,
                   high_price = price,
                   low_price  = price,
                   volume     = 0
        """))
    print("   Daily prices reset.")


def get_live_prices():
    """Return current live prices for all stocks."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT symbol, price, open_price, high_price,
                   low_price, prev_close, change_amt,
                   change_pct, volume, updated_at
            FROM   live_prices
            ORDER  BY symbol
        """)).fetchall()

    return [
        {
            "symbol":     r[0],
            "price":      float(r[1]),
            "open":       float(r[2]),
            "high":       float(r[3]),
            "low":        float(r[4]),
            "prev_close": float(r[5]),
            "change_amt": float(r[6]),
            "change_pct": float(r[7]),
            "volume":     int(r[8]),
            "updated_at": str(r[9]),
        }
        for r in rows
    ]


def get_live_price(symbol):
    """Return current live price for one stock."""
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT price, change_amt, change_pct, high_price,
                   low_price, open_price, volume
            FROM   live_prices
            WHERE  symbol = :symbol
        """), {"symbol": symbol}).fetchone()

    if not row:
        return None

    return {
        "symbol":     symbol,
        "price":      float(row[0]),
        "change_amt": float(row[1]),
        "change_pct": float(row[2]),
        "high":       float(row[3]),
        "low":        float(row[4]),
        "open":       float(row[5]),
        "volume":     int(row[6]),
    }


if __name__ == "__main__":
    create_simulator_tables()
    initialize_prices()
    print("Simulator initialized!")