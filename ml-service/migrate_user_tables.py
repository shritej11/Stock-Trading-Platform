# migrate_user_tables.py
# Adds user_id to all per-user tables
# Run once with: python migrate_user_tables.py

from sqlalchemy import create_engine, text
from config import DATABASE_URL

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:

    # Add user_id to paper_wallet
    try:
        conn.execute(text("""
            ALTER TABLE paper_wallet
            ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1
        """))
        print("   paper_wallet: added user_id")
    except Exception as e:
        print(f"   paper_wallet: {e}")

    # Add user_id to paper_portfolio
    try:
        conn.execute(text("""
            ALTER TABLE paper_portfolio
            ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1
        """))
        print("   paper_portfolio: added user_id")
    except Exception as e:
        print(f"   paper_portfolio: {e}")

    # Add user_id to paper_trades
    try:
        conn.execute(text("""
            ALTER TABLE paper_trades
            ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1
        """))
        print("   paper_trades: added user_id")
    except Exception as e:
        print(f"   paper_trades: {e}")

    # Add user_id to price_alerts
    try:
        conn.execute(text("""
            ALTER TABLE price_alerts
            ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1
        """))
        print("   price_alerts: added user_id")
    except Exception as e:
        print(f"   price_alerts: {e}")

    # Add user_id to watchlist
    try:
        conn.execute(text("""
            ALTER TABLE watchlist
            ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1
        """))
        # Remove old unique constraint and add user-specific one
        conn.execute(text("""
            ALTER TABLE watchlist
            DROP CONSTRAINT IF EXISTS watchlist_symbol_key
        """))
        conn.execute(text("""
            ALTER TABLE watchlist
            ADD CONSTRAINT watchlist_user_symbol
            UNIQUE (user_id, symbol)
        """))
        print("   watchlist: added user_id")
    except Exception as e:
        print(f"   watchlist: {e}")

    # Add user_id to bot_config
    try:
        conn.execute(text("""
            ALTER TABLE bot_config
            ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1
        """))
        print("   bot_config: added user_id")
    except Exception as e:
        print(f"   bot_config: {e}")

    # Add user_id to bot_trades
    try:
        conn.execute(text("""
            ALTER TABLE bot_trades
            ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1
        """))
        print("   bot_trades: added user_id")
    except Exception as e:
        print(f"   bot_trades: {e}")

print("\nMigration complete!")
print("Now run: uvicorn api_server:app --reload --port 8000")