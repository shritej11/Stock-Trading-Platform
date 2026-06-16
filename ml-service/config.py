# config.py
DB_HOST     = "localhost"
DB_PORT     = "5432"
DB_NAME     = "neurotrade"
DB_USER     = "postgres"
DB_PASSWORD = "postgres"

DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

STOCKS = [
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS",
    "HDFCBANK.NS",
    "ICICIBANK.NS",
    "HINDUNILVR.NS",
    "BAJFINANCE.NS",
    "WIPRO.NS",
    "AXISBANK.NS",
    "KOTAKBANK.NS",
    "MARUTI.NS",
    "SUNPHARMA.NS",
    "TITAN.NS",
    "LTIM.NS",
    "ADANIENT.NS",
]

YEARS_OF_DATA = 2

# Sector mapping for grouping
SECTOR_MAP = {
    "RELIANCE.NS":   "Energy",
    "TCS.NS":        "IT",
    "INFY.NS":       "IT",
    "WIPRO.NS":      "IT",
    "LTIM.NS":       "IT",
    "HDFCBANK.NS":   "Banking",
    "ICICIBANK.NS":  "Banking",
    "AXISBANK.NS":   "Banking",
    "KOTAKBANK.NS":  "Banking",
    "BAJFINANCE.NS": "Finance",
    "HINDUNILVR.NS": "FMCG",
    "MARUTI.NS":     "Auto",
    "SUNPHARMA.NS":  "Pharma",
    "TITAN.NS":      "Consumer",
    "ADANIENT.NS":   "Conglomerate",
}

# Display names
STOCK_NAMES = {
    "RELIANCE.NS":   "Reliance Industries",
    "TCS.NS":        "Tata Consultancy",
    "INFY.NS":       "Infosys",
    "WIPRO.NS":      "Wipro",
    "LTIM.NS":       "LTIMindtree",
    "HDFCBANK.NS":   "HDFC Bank",
    "ICICIBANK.NS":  "ICICI Bank",
    "AXISBANK.NS":   "Axis Bank",
    "KOTAKBANK.NS":  "Kotak Bank",
    "BAJFINANCE.NS": "Bajaj Finance",
    "HINDUNILVR.NS": "Hindustan Unilever",
    "MARUTI.NS":     "Maruti Suzuki",
    "SUNPHARMA.NS":  "Sun Pharma",
    "TITAN.NS":      "Titan Company",
    "ADANIENT.NS":   "Adani Enterprises",
}