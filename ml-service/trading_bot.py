# trading_bot.py
# AI Trading Bot — auto-executes paper trades based on rules + AI signals
# Rules can be preset or customized by user

from sqlalchemy import create_engine, text
from datetime   import datetime
from config     import DATABASE_URL, STOCKS

engine = create_engine(DATABASE_URL)


# ─────────────────────────────────────────────────────
# CREATE BOT TABLES
# ─────────────────────────────────────────────────────

def create_bot_tables():
    with engine.begin() as conn:

        # Bot configuration — one row = one bot config
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS bot_config (
                id                  SERIAL PRIMARY KEY,
                name                VARCHAR(100) DEFAULT 'My AI Bot',
                is_active           BOOLEAN      DEFAULT FALSE,
                strategy            VARCHAR(50)  DEFAULT 'balanced',

                -- BUY rules
                buy_confidence_min  NUMERIC(5,2) DEFAULT 65,
                buy_rsi_max         NUMERIC(5,2) DEFAULT 40,
                buy_quantity        INTEGER      DEFAULT 1,
                buy_max_per_stock   NUMERIC(14,2) DEFAULT 5000,

                -- SELL rules
                sell_confidence_max NUMERIC(5,2) DEFAULT 35,
                sell_rsi_min        NUMERIC(5,2) DEFAULT 70,
                sell_profit_target  NUMERIC(5,2) DEFAULT 5,
                sell_stop_loss      NUMERIC(5,2) DEFAULT 3,

                -- General
                max_open_positions  INTEGER      DEFAULT 5,
                trade_amount        NUMERIC(14,2) DEFAULT 2000,

                created_at          TIMESTAMP    DEFAULT NOW(),
                updated_at          TIMESTAMP    DEFAULT NOW()
            );
        """))

        # Bot trade log
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS bot_trades (
                id          SERIAL PRIMARY KEY,
                symbol      VARCHAR(20)   NOT NULL,
                action      VARCHAR(4)    NOT NULL,
                quantity    INTEGER       NOT NULL,
                price       NUMERIC(12,4) NOT NULL,
                total       NUMERIC(14,2) NOT NULL,
                reason      TEXT,
                confidence  NUMERIC(5,2),
                rsi         NUMERIC(5,2),
                traded_at   TIMESTAMP     DEFAULT NOW()
            );
        """))

        # Bot status log
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS bot_logs (
                id          SERIAL PRIMARY KEY,
                message     TEXT NOT NULL,
                level       VARCHAR(10) DEFAULT 'INFO',
                created_at  TIMESTAMP   DEFAULT NOW()
            );
        """))

        # Insert default config if not exists
        existing = conn.execute(text(
            "SELECT COUNT(*) FROM bot_config"
        )).fetchone()[0]

        if existing == 0:
            conn.execute(text("""
                INSERT INTO bot_config
                    (name, is_active, strategy,
                     buy_confidence_min, buy_rsi_max,
                     buy_quantity, buy_max_per_stock,
                     sell_confidence_max, sell_rsi_min,
                     sell_profit_target, sell_stop_loss,
                     max_open_positions, trade_amount)
                VALUES
                    ('My AI Bot', FALSE, 'balanced',
                     65, 40,
                     1, 5000,
                     35, 70,
                     5, 3,
                     5, 2000)
            """))

    print("   Bot tables created.")


# ─────────────────────────────────────────────────────
# GET BOT CONFIG
# ─────────────────────────────────────────────────────

def get_bot_config():
    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT * FROM bot_config LIMIT 1"
        )).fetchone()

    if not row:
        return None

    return {
        "id":                   row[0],
        "name":                 row[1],
        "is_active":            row[2],
        "strategy":             row[3],
        "buy_confidence_min":   float(row[4]),
        "buy_rsi_max":          float(row[5]),
        "buy_quantity":         int(row[6]),
        "buy_max_per_stock":    float(row[7]),
        "sell_confidence_max":  float(row[8]),
        "sell_rsi_min":         float(row[9]),
        "sell_profit_target":   float(row[10]),
        "sell_stop_loss":       float(row[11]),
        "max_open_positions":   int(row[12]),
        "trade_amount":         float(row[13]),
    }


# ─────────────────────────────────────────────────────
# UPDATE BOT CONFIG
# ─────────────────────────────────────────────────────

def update_bot_config(updates: dict):
    allowed = [
        "name", "is_active", "strategy",
        "buy_confidence_min", "buy_rsi_max",
        "buy_quantity", "buy_max_per_stock",
        "sell_confidence_max", "sell_rsi_min",
        "sell_profit_target", "sell_stop_loss",
        "max_open_positions", "trade_amount",
    ]
    filtered = {k: v for k, v in updates.items() if k in allowed}
    if not filtered:
        return

    set_clause = ", ".join([f"{k} = :{k}" for k in filtered])
    filtered["updated_at"] = datetime.utcnow()

    with engine.begin() as conn:
        conn.execute(text(f"""
            UPDATE bot_config
            SET    {set_clause}, updated_at = :updated_at
        """), filtered)


# ─────────────────────────────────────────────────────
# LOG BOT MESSAGE
# ─────────────────────────────────────────────────────

def log_bot(message: str, level: str = "INFO"):
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO bot_logs (message, level)
            VALUES (:msg, :level)
        """), {"msg": message, "level": level})


# ─────────────────────────────────────────────────────
# GET INDICATORS FOR SYMBOL
# ─────────────────────────────────────────────────────

def get_rsi_for_symbol(symbol: str) -> float:
    import pandas as pd
    try:
        with engine.connect() as conn:
            df = pd.read_sql(
                text("""
                    SELECT close FROM stock_prices
                    WHERE  symbol = :symbol
                    ORDER  BY date DESC
                    LIMIT  50
                """),
                conn,
                params={"symbol": symbol}
            )
        if len(df) < 15:
            return 50.0

        prices = df["close"].iloc[::-1]
        delta  = prices.diff()
        gain   = delta.clip(lower=0).ewm(com=13, min_periods=14).mean()
        loss   = (-delta.clip(upper=0)).ewm(com=13, min_periods=14).mean()
        rs     = gain / loss
        rsi    = 100 - (100 / (1 + rs))
        return round(float(rsi.iloc[-1]), 2)
    except Exception:
        return 50.0


# ─────────────────────────────────────────────────────
# MAIN BOT TICK — called every 30 seconds
# ─────────────────────────────────────────────────────

def run_bot_tick():
    config = get_bot_config()

    if not config or not config["is_active"]:
        return

    log_bot("Bot tick started", "DEBUG")

    with engine.connect() as conn:
        # Get wallet balance
        bal_row  = conn.execute(text(
            "SELECT balance FROM paper_wallet LIMIT 1"
        )).fetchone()
        balance  = float(bal_row[0]) if bal_row else 100000.0

        # Get current holdings
        holdings = conn.execute(text("""
            SELECT symbol, quantity, avg_buy_price
            FROM   paper_portfolio
            WHERE  quantity > 0
        """)).fetchall()

        # Get latest predictions
        predictions = conn.execute(text("""
            SELECT symbol, predicted_price, confidence_score
            FROM   predictions
            WHERE  prediction_date = (
                SELECT MAX(prediction_date) FROM predictions
            )
        """)).fetchall()

        # Get live prices
        live_prices = conn.execute(text("""
            SELECT symbol, price FROM live_prices
        """)).fetchall()

    price_map  = {r[0]: float(r[1]) for r in live_prices}
    pred_map   = {r[0]: {
                   "predicted": float(r[1]),
                   "confidence": float(r[2])
                 } for r in predictions}
    hold_map   = {h[0]: {
                   "quantity": int(h[1]),
                   "avg_buy":  float(h[2])
                 } for h in holdings}

    open_positions = len(hold_map)
    trades_made    = 0

    for symbol in STOCKS:
        price      = price_map.get(symbol)
        pred       = pred_map.get(symbol)
        holding    = hold_map.get(symbol)

        if not price or not pred:
            continue

        confidence = pred["confidence"]
        rsi        = get_rsi_for_symbol(symbol)

        # ── SELL CHECK ──────────────────────────────
        if holding:
            avg_buy      = holding["avg_buy"]
            qty          = holding["quantity"]
            pnl_pct      = ((price - avg_buy) / avg_buy) * 100

            should_sell  = False
            sell_reason  = ""

            # Sell if profit target hit
            if pnl_pct >= config["sell_profit_target"]:
                should_sell = True
                sell_reason = (
                    f"Profit target hit: +{pnl_pct:.1f}% "
                    f"(target: {config['sell_profit_target']}%)"
                )

            # Sell if stop loss hit
            elif pnl_pct <= -config["sell_stop_loss"]:
                should_sell = True
                sell_reason = (
                    f"Stop loss hit: {pnl_pct:.1f}% "
                    f"(limit: -{config['sell_stop_loss']}%)"
                )

            # Sell if AI confidence dropped
            elif confidence <= config["sell_confidence_max"]:
                should_sell = True
                sell_reason = (
                    f"Low confidence: {confidence} "
                    f"(threshold: {config['sell_confidence_max']})"
                )

            # Sell if RSI overbought
            elif rsi >= config["sell_rsi_min"]:
                should_sell = True
                sell_reason = (
                    f"RSI overbought: {rsi} "
                    f"(threshold: {config['sell_rsi_min']})"
                )

            if should_sell:
                total = round(price * qty, 2)
                _execute_trade(
                    symbol, "SELL", qty, price, total,
                    sell_reason, confidence, rsi
                )
                log_bot(
                    f"SELL {qty} {symbol} @ ₹{price} — {sell_reason}"
                )
                trades_made += 1
                open_positions -= 1
                continue

        # ── BUY CHECK ───────────────────────────────
        if holding:
            continue  # Already holding this stock

        if open_positions >= config["max_open_positions"]:
            continue  # Max positions reached

        should_buy  = False
        buy_reason  = ""

        # Buy if confidence is high
        if confidence >= config["buy_confidence_min"]:
            should_buy = True
            buy_reason = (
                f"High confidence: {confidence} "
                f"(threshold: {config['buy_confidence_min']})"
            )

        # Buy if RSI oversold
        if rsi <= config["buy_rsi_max"] and confidence >= 50:
            should_buy = True
            buy_reason = (
                f"RSI oversold: {rsi} "
                f"(threshold: {config['buy_rsi_max']}) "
                f"+ confidence: {confidence}"
            )

        if should_buy:
            # Calculate quantity based on trade amount
            qty   = max(1, int(config["trade_amount"] / price))
            total = round(price * qty, 2)

            if total > balance:
                log_bot(
                    f"Insufficient balance for {symbol}. "
                    f"Need ₹{total}, have ₹{balance:.0f}",
                    "WARN"
                )
                continue

            if total > config["buy_max_per_stock"]:
                qty   = max(1, int(config["buy_max_per_stock"] / price))
                total = round(price * qty, 2)

            _execute_trade(
                symbol, "BUY", qty, price, total,
                buy_reason, confidence, rsi
            )
            log_bot(
                f"BUY {qty} {symbol} @ ₹{price} — {buy_reason}"
            )
            trades_made    += 1
            open_positions += 1
            balance        -= total

    if trades_made > 0:
        log_bot(f"Bot tick complete — {trades_made} trade(s) executed")
    else:
        log_bot("Bot tick complete — no trades this cycle", "DEBUG")


# ─────────────────────────────────────────────────────
# EXECUTE A TRADE
# ─────────────────────────────────────────────────────

def _execute_trade(symbol, action, quantity,
                   price, total, reason, confidence, rsi):
    with engine.begin() as conn:

        if action == "BUY":
            conn.execute(text(
                "UPDATE paper_wallet SET balance = balance - :total"
            ), {"total": total})

            existing = conn.execute(text("""
                SELECT quantity, avg_buy_price
                FROM   paper_portfolio
                WHERE  symbol = :symbol
            """), {"symbol": symbol}).fetchone()

            if existing:
                old_qty = int(existing[0])
                old_avg = float(existing[1])
                new_qty = old_qty + quantity
                new_avg = ((old_avg * old_qty) + (price * quantity)) / new_qty
                conn.execute(text("""
                    UPDATE paper_portfolio
                    SET    quantity = :qty, avg_buy_price = :avg
                    WHERE  symbol   = :symbol
                """), {"qty": new_qty, "avg": new_avg, "symbol": symbol})
            else:
                conn.execute(text("""
                    INSERT INTO paper_portfolio
                        (symbol, quantity, avg_buy_price)
                    VALUES (:symbol, :qty, :avg)
                """), {"symbol": symbol, "qty": quantity, "avg": price})

        else:  # SELL
            conn.execute(text(
                "UPDATE paper_wallet SET balance = balance + :total"
            ), {"total": total})

            conn.execute(text("""
                UPDATE paper_portfolio
                SET    quantity = quantity - :qty
                WHERE  symbol   = :symbol
            """), {"qty": quantity, "symbol": symbol})

        # Log the bot trade
        conn.execute(text("""
            INSERT INTO bot_trades
                (symbol, action, quantity, price, total,
                 reason, confidence, rsi)
            VALUES
                (:symbol, :action, :qty, :price, :total,
                 :reason, :confidence, :rsi)
        """), {
            "symbol":     symbol,
            "action":     action,
            "qty":        quantity,
            "price":      price,
            "total":      total,
            "reason":     reason,
            "confidence": confidence,
            "rsi":        rsi,
        })

        # Also log in paper_trades so portfolio reflects it
        conn.execute(text("""
            INSERT INTO paper_trades
                (symbol, action, quantity, price, total)
            VALUES
                (:symbol, :action, :qty, :price, :total)
        """), {
            "symbol": symbol,
            "action": action,
            "qty":    quantity,
            "price":  price,
            "total":  total,
        })


# ─────────────────────────────────────────────────────
# GET BOT TRADE HISTORY
# ─────────────────────────────────────────────────────

def get_bot_trades(limit: int = 50):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT symbol, action, quantity, price,
                   total, reason, confidence, rsi, traded_at
            FROM   bot_trades
            ORDER  BY traded_at DESC
            LIMIT  :limit
        """), {"limit": limit}).fetchall()

    return [
        {
            "symbol":     r[0],
            "action":     r[1],
            "quantity":   int(r[2]),
            "price":      round(float(r[3]), 2),
            "total":      round(float(r[4]), 2),
            "reason":     r[5],
            "confidence": round(float(r[6]), 2) if r[6] else None,
            "rsi":        round(float(r[7]), 2) if r[7] else None,
            "traded_at":  str(r[8]),
        }
        for r in rows
    ]


# ─────────────────────────────────────────────────────
# GET BOT LOGS
# ─────────────────────────────────────────────────────

def get_bot_logs(limit: int = 30):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT message, level, created_at
            FROM   bot_logs
            ORDER  BY created_at DESC
            LIMIT  :limit
        """), {"limit": limit}).fetchall()

    return [
        {
            "message":    r[0],
            "level":      r[1],
            "created_at": str(r[2]),
        }
        for r in rows
    ]


if __name__ == "__main__":
    create_bot_tables()
    print("Bot initialized!")