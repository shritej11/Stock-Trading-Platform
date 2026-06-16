from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path('D:/Stock/ml-service/.env'))

from sqlalchemy import create_engine, text
from config import DATABASE_URL

engine = create_engine(DATABASE_URL)
with engine.begin() as conn:
    conn.execute(text('DELETE FROM rate_limits'))
print('All rate limits cleared!')