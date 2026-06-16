# auth_utils.py
# JWT, password hashing, OTP generation, email and SMS sending

import os
import random
import smtplib
import string
from datetime          import datetime, timedelta
from email.mime.text   import MIMEText
from email.mime.multipart import MIMEMultipart
from typing            import Optional

from jose              import JWTError, jwt
from passlib.context   import CryptContext
from dotenv            import load_dotenv
from sqlalchemy        import create_engine, text

from config            import DATABASE_URL

from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

engine     = create_engine(DATABASE_URL)
pwd_ctx    = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET  = os.getenv("JWT_SECRET_KEY", "fallback_secret")
JWT_ALG     = os.getenv("JWT_ALGORITHM",  "HS256")
JWT_EXPIRE  = int(os.getenv("JWT_EXPIRE_MINUTES", 60))


# ─────────────────────────────────────────────────────
# PASSWORD
# ─────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ─────────────────────────────────────────────────────
# JWT TOKENS
# ─────────────────────────────────────────────────────

def create_access_token(data: dict, expires_minutes: int = JWT_EXPIRE) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    payload["type"] = "access"
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"]  = datetime.utcnow() + timedelta(days=7)
    payload["type"] = "refresh"
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except JWTError:
        return None


# ─────────────────────────────────────────────────────
# OTP
# ─────────────────────────────────────────────────────

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def save_otp(identifier: str, purpose: str) -> str:
    otp  = generate_otp()
    exp  = datetime.utcnow() + timedelta(minutes=5)

    with engine.begin() as conn:
        # Invalidate old OTPs for same identifier + purpose
        conn.execute(text("""
            UPDATE otp_store
            SET    is_used = TRUE
            WHERE  identifier = :id AND purpose = :purpose AND is_used = FALSE
        """), {"id": identifier, "purpose": purpose})

        # Save new OTP
        conn.execute(text("""
            INSERT INTO otp_store (identifier, otp_code, purpose, expires_at)
            VALUES (:id, :otp, :purpose, :exp)
        """), {"id": identifier, "otp": otp, "purpose": purpose, "exp": exp})

    return otp

def verify_otp(identifier: str, otp_code: str, purpose: str) -> dict:
    with engine.begin() as conn:
        result = conn.execute(text("""
            SELECT id, otp_code, expires_at, is_used, attempts
            FROM   otp_store
            WHERE  identifier = :id
              AND  purpose    = :purpose
              AND  is_used    = FALSE
            ORDER  BY created_at DESC
            LIMIT  1
        """), {"id": identifier, "purpose": purpose})
        row = result.fetchone()

        if not row:
            return {"success": False, "error": "No OTP found. Please request a new one."}

        otp_id, stored_otp, expires_at, is_used, attempts = row

        # Check expiry
        if datetime.utcnow() > expires_at:
            return {"success": False, "error": "OTP has expired. Please request a new one."}

        # Check max attempts (3 tries)
        if attempts >= 3:
            conn.execute(text(
                "UPDATE otp_store SET is_used = TRUE WHERE id = :id"
            ), {"id": otp_id})
            return {"success": False, "error": "Too many attempts. Please request a new OTP."}

        # Check OTP match
        if otp_code != stored_otp:
            conn.execute(text(
                "UPDATE otp_store SET attempts = attempts + 1 WHERE id = :id"
            ), {"id": otp_id})
            remaining = 3 - (attempts + 1)
            return {"success": False, "error": f"Incorrect OTP. {remaining} attempts remaining."}

        # Mark as used
        conn.execute(text(
            "UPDATE otp_store SET is_used = TRUE WHERE id = :id"
        ), {"id": otp_id})

    return {"success": True}


# ─────────────────────────────────────────────────────
# RATE LIMITING
# ─────────────────────────────────────────────────────

def check_rate_limit(identifier: str, action: str,
                     max_attempts: int = 50,
                     block_minutes: int = 1) -> dict:
    with engine.begin() as conn:
        result = conn.execute(text("""
            SELECT attempts, blocked_until
            FROM   rate_limits
            WHERE  identifier = :id AND action = :action
        """), {"id": identifier, "action": action})
        row = result.fetchone()

        if row:
            attempts, blocked_until = row
            if blocked_until and datetime.utcnow() < blocked_until:
                wait = int((blocked_until - datetime.utcnow()).total_seconds() / 60)
                return {"allowed": False,
                        "error": f"Too many attempts. Try again in {wait} minutes."}

            if attempts >= max_attempts:
                block_time = datetime.utcnow() + timedelta(minutes=block_minutes)
                conn.execute(text("""
                    UPDATE rate_limits
                    SET    blocked_until = :bt, last_attempt = NOW()
                    WHERE  identifier = :id AND action = :action
                """), {"bt": block_time, "id": identifier, "action": action})
                return {"allowed": False,
                        "error": f"Too many attempts. Blocked for {block_minutes} minutes."}

            conn.execute(text("""
                UPDATE rate_limits
                SET    attempts = attempts + 1, last_attempt = NOW()
                WHERE  identifier = :id AND action = :action
            """), {"id": identifier, "action": action})
        else:
            conn.execute(text("""
                INSERT INTO rate_limits (identifier, action, attempts)
                VALUES (:id, :action, 1)
            """), {"id": identifier, "action": action})

    return {"allowed": True}

def reset_rate_limit(identifier: str, action: str):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE rate_limits
            SET    attempts = 0, blocked_until = NULL
            WHERE  identifier = :id AND action = :action
        """), {"id": identifier, "action": action})


# ─────────────────────────────────────────────────────
# SEND EMAIL OTP
# ─────────────────────────────────────────────────────

def send_email_otp(to_email: str, otp: str, purpose: str):
    try:
        subject_map = {
            "email_verify":   "Verify your NeuroTrade account",
            "2fa":            "NeuroTrade — Your login OTP",
            "password_reset": "NeuroTrade — Password reset OTP",
        }
        subject = subject_map.get(purpose, "NeuroTrade OTP")

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;
                    background:#f0f4f8;padding:32px;border-radius:12px;">
            <div style="background:#fff;border-radius:12px;padding:28px;
                        border:1px solid #e2e8f0;">
                <h2 style="color:#111928;text-align:center;">NeuroTrade AI</h2>
                <p style="color:#374151;font-size:14px;">Your verification code is:</p>
                <div style="background:#f0f4f8;border:2px dashed #1a56db;
                            border-radius:12px;padding:24px;text-align:center;">
                    <span style="font-size:40px;font-weight:800;
                                 letter-spacing:14px;color:#1a56db;">{otp}</span>
                </div>
                <p style="color:#92400e;font-size:12px;margin-top:16px;">
                    ⏱ Expires in 5 minutes. Never share this code.
                </p>
            </div>
        </div>
        """

        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"]    = os.getenv("SMTP_USER")
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
            server.sendmail(os.getenv("SMTP_USER"), to_email, msg.as_string())

        print(f"   OTP email sent to {to_email} via Gmail SMTP")
        return True

    except Exception as e:
        print(f"   Email send failed: {e}")
        return False
# ─────────────────────────────────────────────────────
# SEND SMS OTP (Twilio)
# ─────────────────────────────────────────────────────

def send_sms_otp(phone: str, otp: str):
    try:
        from twilio.rest import Client
        client = Client(
            os.getenv("TWILIO_ACCOUNT_SID"),
            os.getenv("TWILIO_AUTH_TOKEN")
        )
        client.messages.create(
            body=f"Your NeuroTrade verification code is: {otp}. Valid for 5 minutes.",
            from_=os.getenv("TWILIO_PHONE"),
            to=phone
        )
        print(f"   SMS OTP sent to {phone}")
        return True
    except Exception as e:
        print(f"   SMS send failed: {e}")
        return False