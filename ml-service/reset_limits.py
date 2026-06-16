from sqlalchemy import create_engine, text
from config import DATABASE_URL

engine = create_engine(DATABASE_URL)
with engine.begin() as conn:
    conn.execute(text('DELETE FROM rate_limits'))
    conn.execute(text('DELETE FROM otp_store'))
    print('Rate limits and OTPs cleared!')