# alerts.py
# Price alert system — create, check and trigger alerts

from sqlalchemy import create_engine, text
from config     import DATABASE_URL

engine = create_engine(DATABASE_URL)


def create_alerts_table():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS price_alerts (
                id           SERIAL PRIMARY KEY,
                symbol       VARCHAR(20)  NOT NULL,
                target_price NUMERIC(12,4) NOT NULL,
                condition    VARCHAR(10)  NOT NULL,
                note         TEXT,
                is_triggered BOOLEAN      DEFAULT FALSE,
                triggered_at TIMESTAMP,
                created_at   TIMESTAMP    DEFAULT NOW()
            );
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS watchlist (
                id         SERIAL PRIMARY KEY,
                symbol     VARCHAR(20) NOT NULL UNIQUE,
                added_at   TIMESTAMP   DEFAULT NOW()
            );
        """))
    print("   Alerts and watchlist tables created.")


def check_alerts():
    """Check all active alerts against current prices."""
    with engine.connect() as conn:
        alerts = conn.execute(text("""
            SELECT a.id, a.symbol, a.target_price, a.condition, a.note
            FROM   price_alerts a
            WHERE  a.is_triggered = FALSE
        """)).fetchall()

    triggered = []

    for alert in alerts:
        alert_id, symbol, target, condition, note = alert

        with engine.connect() as conn:
            row = conn.execute(text("""
                SELECT close FROM stock_prices
                WHERE  symbol = :symbol
                ORDER  BY date DESC LIMIT 1
            """), {"symbol": symbol}).fetchone()

        if not row:
            continue

        current = float(row[0])
        target  = float(target)

        hit = (condition == "above" and current >= target) or \
              (condition == "below" and current <= target)

        if hit:
            with engine.begin() as conn:
                conn.execute(text("""
                    UPDATE price_alerts
                    SET    is_triggered = TRUE, triggered_at = NOW()
                    WHERE  id = :id
                """), {"id": alert_id})

            triggered.append({
                "symbol":        symbol,
                "target_price":  target,
                "current_price": current,
                "condition":     condition,
                "note":          note,
            })

    return triggered