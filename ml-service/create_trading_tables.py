# create_trading_tables.py
# Run once to create paper trading tables
# Run with: python create_trading_tables.py

from sqlalchemy import create_engine, text
from config import DATABASE_URL

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:

    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS paper_wallet (
            id      SERIAL PRIMARY KEY,
            balance NUMERIC(14, 2) DEFAULT 100000.00
        );
    """))

    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS paper_portfolio (
            id            SERIAL PRIMARY KEY,
            symbol        VARCHAR(20)   NOT NULL UNIQUE,
            quantity      INTEGER       DEFAULT 0,
            avg_buy_price NUMERIC(12,4) DEFAULT 0
        );
    """))

    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS paper_trades (
            id         SERIAL PRIMARY KEY,
            symbol     VARCHAR(20)   NOT NULL,
            action     VARCHAR(4)    NOT NULL,
            quantity   INTEGER       NOT NULL,
            price      NUMERIC(12,4) NOT NULL,
            total      NUMERIC(14,2) NOT NULL,
            traded_at  TIMESTAMP DEFAULT NOW()
        );
    """))

    # Insert starting wallet balance (only if empty)
    existing = conn.execute(text(
        "SELECT COUNT(*) FROM paper_wallet"
    )).fetchone()

    if existing[0] == 0:
        conn.execute(text(
            "INSERT INTO paper_wallet (balance) VALUES (100000.00)"
        ))
        print("   Wallet created with Rs.1,00,000 starting balance.")
    else:
        print("   Wallet already exists.")

print("   Tables created: paper_wallet, paper_portfolio, paper_trades")
print("   Done!")