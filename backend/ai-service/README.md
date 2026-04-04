# EvoChain AI Service

FastAPI service for EvoChain's optimization loop.

## Endpoints

- `GET /health` returns service metadata.
- `POST /optimize` accepts node telemetry and returns a safe recommendation.

## Local Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Internal Modules

- `app/schemas/` for request and response contracts
- `app/services/arima_forecaster.py` for forecast logic
- `app/services/rl_agent.py` for policy decisions
- `app/services/simulation.py` for safety checks
- `app/services/optimizer.py` for orchestration

