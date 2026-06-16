.\venv\Scripts\Activate.ps1
venv\Scripts\activate

cd ml-service
python -m uvicorn api_server:app --reload --port 8000

cd frontend
npm start
