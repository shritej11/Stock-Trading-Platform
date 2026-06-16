# user_setup.py
# Sets up a fresh wallet and portfolio for each new user

from sqlalchemy import create_engine, text
from config     import DATABASE_URL

engine = create_engine(DATABASE_URL)

STARTING_BALANCE = 100000.0

def setup_new_user(user_id: int):
    """Create wallet and empty portfolio for a new user."""
    with engine.begin() as conn:

        # Check if wallet already exists for this user
        existing = conn.execute(text("""
            SELECT id FROM paper_wallet
            WHERE  user_id = :uid
        """), {"uid": user_id}).fetchone()

        if not existing:
            conn.execute(text("""
                INSERT INTO paper_wallet (user_id, balance)
                VALUES (:uid, :balance)
            """), {"uid": user_id, "balance": STARTING_BALANCE})
            print(f"   Created wallet for user {user_id} with Rs.{STARTING_BALANCE}")
        else:
            print(f"   Wallet already exists for user {user_id}")

def get_user_balance(user_id: int) -> float:
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT balance FROM paper_wallet
            WHERE  user_id = :uid
        """), {"uid": user_id}).fetchone()
    return float(row[0]) if row else STARTING_BALANCE

def reset_user_data(user_id: int):
    """Reset a user's portfolio back to starting state."""
    with engine.begin() as conn:
        # Reset wallet
        conn.execute(text("""
            UPDATE paper_wallet
            SET    balance = :balance
            WHERE  user_id = :uid
        """), {"balance": STARTING_BALANCE, "uid": user_id})

        # Clear holdings
        conn.execute(text("""
            DELETE FROM paper_portfolio
            WHERE  user_id = :uid
        """), {"uid": user_id})

        # Clear trades
        conn.execute(text("""
            DELETE FROM paper_trades
            WHERE  user_id = :uid
        """), {"uid": user_id})

        # Clear alerts
        conn.execute(text("""
            DELETE FROM price_alerts
            WHERE  user_id = :uid
        """), {"uid": user_id})

        # Clear watchlist
        conn.execute(text("""
            DELETE FROM watchlist
            WHERE  user_id = :uid
        """), {"uid": user_id})

    print(f"   Reset all data for user {user_id}")