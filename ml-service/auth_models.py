# auth_models.py
# Database tables and Pydantic models for authentication

from sqlalchemy        import create_engine, text
from pydantic          import BaseModel
from typing            import Optional
from config            import DATABASE_URL

engine = create_engine(DATABASE_URL)


# ─────────────────────────────────────────────────────
# CREATE AUTH TABLES
# ─────────────────────────────────────────────────────

def create_auth_tables():
    with engine.begin() as conn:

        # Users table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id                SERIAL PRIMARY KEY,
                email             VARCHAR(255) UNIQUE,
                phone             VARCHAR(20)  UNIQUE,
                hashed_password   TEXT,
                full_name         VARCHAR(255),
                google_id         VARCHAR(255) UNIQUE,
                auth_provider     VARCHAR(20)  DEFAULT 'email',
                is_verified       BOOLEAN      DEFAULT FALSE,
                is_active         BOOLEAN      DEFAULT TRUE,
                two_fa_enabled    BOOLEAN      DEFAULT TRUE,
                created_at        TIMESTAMP    DEFAULT NOW(),
                last_login        TIMESTAMP
            );
        """))

        # OTP table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS otp_store (
                id          SERIAL PRIMARY KEY,
                identifier  VARCHAR(255) NOT NULL,
                otp_code    VARCHAR(6)   NOT NULL,
                purpose     VARCHAR(30)  NOT NULL,
                is_used     BOOLEAN      DEFAULT FALSE,
                attempts    INTEGER      DEFAULT 0,
                expires_at  TIMESTAMP    NOT NULL,
                created_at  TIMESTAMP    DEFAULT NOW()
            );
        """))

        # Sessions table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id            SERIAL PRIMARY KEY,
                user_id       INTEGER REFERENCES users(id),
                token         TEXT    NOT NULL,
                device_info   TEXT,
                ip_address    VARCHAR(50),
                is_active     BOOLEAN   DEFAULT TRUE,
                created_at    TIMESTAMP DEFAULT NOW(),
                expires_at    TIMESTAMP NOT NULL
            );
        """))

        # Rate limiting table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS rate_limits (
                id          SERIAL PRIMARY KEY,
                identifier  VARCHAR(255) NOT NULL,
                action      VARCHAR(50)  NOT NULL,
                attempts    INTEGER      DEFAULT 1,
                blocked_until TIMESTAMP,
                last_attempt  TIMESTAMP  DEFAULT NOW(),
                UNIQUE (identifier, action)
            );
        """))

    print("   Auth tables created successfully.")


# ─────────────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email:     str
    password:  str
    full_name: str

class LoginRequest(BaseModel):
    email:    str
    password: str

class VerifyOTPRequest(BaseModel):
    identifier: str          # email or phone
    otp_code:   str
    purpose:    str          # email_verify / 2fa / phone_login

class ResendOTPRequest(BaseModel):
    identifier: str
    purpose:    str

class GoogleAuthRequest(BaseModel):
    token: str               # Google ID token from frontend

class PhoneLoginRequest(BaseModel):
    phone: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str


if __name__ == "__main__":
    create_auth_tables()
    print("Done!")