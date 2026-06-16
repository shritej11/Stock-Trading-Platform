# auth_routes.py
# All authentication API endpoints

from unittest import result

from fastapi           import APIRouter, HTTPException, Request, Depends
from fastapi.security  import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy        import text
from datetime          import datetime
from typing            import Optional

from auth_models       import (
    SignupRequest, LoginRequest, VerifyOTPRequest,
    ResendOTPRequest, GoogleAuthRequest, PhoneLoginRequest,
    engine
)
from auth_utils        import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    save_otp, verify_otp,
    check_rate_limit, reset_rate_limit,
    send_email_otp, send_sms_otp,
)
from user_setup import setup_new_user

router  = APIRouter(prefix="/auth", tags=["Authentication"])
bearer  = HTTPBearer()


# ─────────────────────────────────────────────────────
# HELPER: get user by email
# ─────────────────────────────────────────────────────

def get_user_by_email(email: str):
    with engine.connect() as conn:
        r = conn.execute(text(
            "SELECT * FROM users WHERE email = :email"
        ), {"email": email})
        return r.fetchone()

def get_user_by_phone(phone: str):
    with engine.connect() as conn:
        r = conn.execute(text(
            "SELECT * FROM users WHERE phone = :phone"
        ), {"phone": phone})
        return r.fetchone()

def get_user_by_id(user_id: int):
    with engine.connect() as conn:
        r = conn.execute(text(
            "SELECT * FROM users WHERE id = :id"
        ), {"id": user_id})
        return r.fetchone()


# ─────────────────────────────────────────────────────
# MIDDLEWARE: verify JWT token
# ─────────────────────────────────────────────────────

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    token   = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = get_user_by_id(payload.get("user_id"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return user


# ─────────────────────────────────────────────────────
# ROUTE: POST /auth/signup
# ─────────────────────────────────────────────────────

@router.post("/signup")
def signup(req: SignupRequest):
    # Rate limit signups per email
    rl = check_rate_limit(req.email, "signup", max_attempts=5, block_minutes=60)
    if not rl["allowed"]:
        raise HTTPException(status_code=429, detail=rl["error"])

    # Check if email already exists
    if get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Validate password strength
    if len(req.password) < 8:
        raise HTTPException(status_code=400,
                            detail="Password must be at least 8 characters.")

    hashed = hash_password(req.password)

    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO users (email, hashed_password, full_name, auth_provider)
            VALUES (:email, :password, :name, 'email')
            RETURNING id
        """), {
            "email":    req.email,
            "password": hashed,
            "name":     req.full_name,
        })
        user_id = result.fetchone()[0]
        setup_new_user(user_id)

    # Send email verification OTP
    otp = save_otp(req.email, "email_verify")
    send_email_otp(req.email, otp, "email_verify")

    return {
        "success": True,
        "message": "Account created. Please verify your email with the OTP sent.",
        "user_id": user_id,
        "next_step": "verify_email"
    }


# ─────────────────────────────────────────────────────
# ROUTE: POST /auth/login
# ─────────────────────────────────────────────────────

@router.post("/login")
def login(req: LoginRequest):
    # Rate limit login attempts
    rl = check_rate_limit(req.email, "login", max_attempts=5, block_minutes=15)
    if not rl["allowed"]:
        raise HTTPException(status_code=429, detail=rl["error"])

    user = get_user_by_email(req.email)

    if not user or not verify_password(req.password, user[3]):
        raise HTTPException(status_code=401,
                            detail="Incorrect email or password.")

    if not user[10]:   # is_active
        raise HTTPException(status_code=403, detail="Account is disabled.")

    reset_rate_limit(req.email, "login")

    # If 2FA enabled → send OTP and return pending state
    if user[11]:  # two_fa_enabled
        otp = save_otp(req.email, "2fa")
        sent = send_email_otp(req.email, otp, "2fa")

        return {
            "success":    True,
            "two_fa":     True,
            "message":    "OTP sent to your email. Please verify to complete login.",
            "identifier": req.email,
            "next_step":  "verify_2fa"
        }

    # No 2FA — issue tokens directly
    access_token  = create_access_token({"user_id": user[0], "email": user[1]})
    refresh_token = create_refresh_token({"user_id": user[0]})

    with engine.begin() as conn:
        conn.execute(text(
            "UPDATE users SET last_login = NOW() WHERE id = :id"
        ), {"id": user[0]})

    return {
        "success":       True,
        "two_fa":        False,
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "user": {
            "id":       user[0],
            "email":    user[1],
            "name":     user[5],
            "verified": user[8],
        }
    }


# ─────────────────────────────────────────────────────
# ROUTE: POST /auth/verify-otp
# ─────────────────────────────────────────────────────

@router.post("/verify-otp")
def verify_otp_route(req: VerifyOTPRequest):
    rl = check_rate_limit(req.identifier, "otp_verify", max_attempts=10, block_minutes=15)
    if not rl["allowed"]:
        raise HTTPException(status_code=429, detail=rl["error"])

    result = verify_otp(req.identifier, req.otp_code, req.purpose)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])

    # Mark email as verified
    if req.purpose == "email_verify":
        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE users SET is_verified = TRUE
                WHERE  email = :email
            """), {"email": req.identifier})
        return {"success": True, "message": "Email verified successfully. You can now log in."}

    # 2FA verification — issue tokens
    if req.purpose in ["2fa", "phone_login"]:
        user = (get_user_by_email(req.identifier)
                or get_user_by_phone(req.identifier))

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        access_token  = create_access_token({"user_id": user[0], "email": user[1]})
        refresh_token = create_refresh_token({"user_id": user[0]})

        with engine.begin() as conn:
            conn.execute(text(
                "UPDATE users SET last_login = NOW() WHERE id = :id"
            ), {"id": user[0]})

        reset_rate_limit(req.identifier, "otp_verify")

        setup_new_user(user[0])

        return {
            "success":       True,
            "message":       "Verification successful.",
            "access_token":  access_token,
            "refresh_token": refresh_token,
            "user": {
                "id":       user[0],
                "email":    user[1],
                "name":     user[5],
                "verified": user[8],
            }
        }

    return {"success": True, "message": "OTP verified."}


# ─────────────────────────────────────────────────────
# ROUTE: POST /auth/resend-otp
# ─────────────────────────────────────────────────────

@router.post("/resend-otp")
def resend_otp(req: ResendOTPRequest):
    # Strict rate limit — max 3 resends per 10 minutes
    rl = check_rate_limit(req.identifier, f"resend_{req.purpose}",
                          max_attempts=3, block_minutes=10)
    if not rl["allowed"]:
        raise HTTPException(status_code=429, detail=rl["error"])

    otp = save_otp(req.identifier, req.purpose)

    if "@" in req.identifier:
        send_email_otp(req.identifier, otp, req.purpose)
    else:
        send_sms_otp(req.identifier, otp)

    return {
        "success": True,
        "message": "New OTP sent. It expires in 5 minutes."
    }


# ─────────────────────────────────────────────────────
# ROUTE: POST /auth/phone-login
# ─────────────────────────────────────────────────────

@router.post("/phone-login")
def phone_login(req: PhoneLoginRequest):
    rl = check_rate_limit(req.phone, "phone_login", max_attempts=5, block_minutes=15)
    if not rl["allowed"]:
        raise HTTPException(status_code=429, detail=rl["error"])

    # Auto-create user if first time
    user = get_user_by_phone(req.phone)

    if not user:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO users (phone, auth_provider, is_verified)
                VALUES (:phone, 'phone', TRUE)
            """), {"phone": req.phone})
        new_user_id = result.fetchone()[0]
        setup_new_user(new_user_id)

    otp = save_otp(req.phone, "phone_login")
    send_sms_otp(req.phone, otp)

    return {
        "success":    True,
        "message":    "OTP sent to your mobile number.",
        "identifier": req.phone,
        "next_step":  "verify_otp"
    }


# ─────────────────────────────────────────────────────
# ROUTE: POST /auth/google
# ─────────────────────────────────────────────────────

@router.post("/google")
def google_auth(req: GoogleAuthRequest):
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as grequests
        import os

        client_id = os.getenv("GOOGLE_CLIENT_ID")
        id_info   = id_token.verify_oauth2_token(
            req.token,
            grequests.Request(),
            client_id
        )

        google_id = id_info["sub"]
        email     = id_info.get("email")
        name      = id_info.get("name", "")

        # Check if user exists
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT * FROM users
                WHERE google_id = :gid OR email = :email
            """), {"gid": google_id, "email": email})
            user = result.fetchone()

        if not user:
            # Create new user
            with engine.begin() as conn:
                result = conn.execute(text("""
                    INSERT INTO users
                        (email, google_id, full_name, auth_provider, is_verified)
                    VALUES
                        (:email, :gid, :name, 'google', TRUE)
                    RETURNING id
                """), {"email": email, "gid": google_id, "name": name})
                user_id = result.fetchone()[0]
                
        else:
            user_id = user[0]
            # Link Google ID if not linked
            with engine.begin() as conn:
                conn.execute(text("""
                    UPDATE users SET google_id = :gid WHERE id = :id
                """), {"gid": google_id, "id": user_id})
            setup_new_user(user_id)

        # Google users still go through 2FA
        user_row = get_user_by_id(user_id)
        otp      = save_otp(email, "2fa")
        send_email_otp(email, otp, "2fa")

        return {
            "success":    True,
            "two_fa":     True,
            "message":    "Google sign-in successful. OTP sent for 2FA verification.",
            "identifier": email,
            "next_step":  "verify_2fa"
        }

    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")


# ─────────────────────────────────────────────────────
# ROUTE: POST /auth/refresh
# ─────────────────────────────────────────────────────

@router.post("/refresh")
def refresh_token(req: dict):
    token   = req.get("refresh_token")
    payload = decode_token(token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    user = get_user_by_id(payload.get("user_id"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    new_access = create_access_token({"user_id": user[0], "email": user[1]})

    return {
        "success":      True,
        "access_token": new_access
    }


# ─────────────────────────────────────────────────────
# ROUTE: GET /auth/me
# ─────────────────────────────────────────────────────

@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    return {
        "id":            current_user[0],
        "email":         current_user[1],
        "phone":         current_user[2],
        "full_name":     current_user[5],
        "auth_provider": current_user[7],
        "is_verified":   current_user[8],
        "two_fa_enabled": current_user[11],
        "created_at":    str(current_user[12]),
        "last_login":    str(current_user[13]),
    }


# ─────────────────────────────────────────────────────
# ROUTE: GET /auth/sessions
# ─────────────────────────────────────────────────────

@router.get("/sessions")
def get_sessions(current_user = Depends(get_current_user)):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT device_info, ip_address, created_at, expires_at, is_active
            FROM   user_sessions
            WHERE  user_id = :uid
            ORDER  BY created_at DESC
            LIMIT  10
        """), {"uid": current_user[0]})
        rows = result.fetchall()

    return {
        "sessions": [
            {
                "device":     r[0],
                "ip":         r[1],
                "created_at": str(r[2]),
                "expires_at": str(r[3]),
                "is_active":  r[4],
            }
            for r in rows
        ]
    }