# EvoChain AI

EvoChain AI is a self-optimizing blockchain prototype with three connected layers:

- `evochain/`: a Rust blockchain node that mines blocks, validates peers, tracks telemetry, requests AI decisions, and publishes node state.
- `backend/ai-service/`: a FastAPI control plane that stores platform data, runs forecasting plus RL policy logic, and serves explorer/dashboard APIs.
- `frontend/dashboard/`: a React dashboard adapted from the supplied frontend zip and connected to the live backend APIs.

The project now supports persistent storage with MongoDB, hot-state caching with Redis, indexed search with Elasticsearch, and a multi-page dashboard covering operations, AI, security, governance, and explorer views.

## Implemented Features

### Blockchain and AI Loop

- Adaptive block size and gas price selection through `POST /optimize`
- Rust-to-Python optimization bridge with safe fallback to local config
- ARIMA-backed short-horizon forecasting with heuristic fallback for short histories
- Online Q-learning policy that updates rewards from observed block production
- Guardrail layer that clamps unsafe block size or gas decisions
- Node-state ingest after mined blocks so the backend receives blocks, transactions, telemetry, and applied optimization metadata

### Backend Platform APIs

- `GET /health`
- `POST /optimize`
- `POST /api/ingest/node-state`
- `GET /api/dashboard/summary`
- `GET /api/network/overview`
- `GET /api/blocks`
- `GET /api/transactions`
- `GET /api/search`
- `GET /api/ai/insights`
- `GET /api/security/alerts`
- `GET /api/governance/proposals`
- `POST /api/governance/proposals`

### Frontend Dashboard

- Dashboard page for live overview, telemetry, recent blocks, and active alerts
- AI Insights page for forecast status, RL status, dependency health, and recent optimization history
- Explorer page for block, transaction, and proposal search
- Security page for alert posture and threat-surface telemetry
- Governance page for creating and listing proposals
- About page for architecture and adaptive execution flow

## Storage Topology

The backend is designed to run best with:

- MongoDB: source-of-truth storage for blocks, transactions, telemetry, alerts, optimizations, and governance proposals
- Redis: cache for network overview, latest optimizer state, and RL Q-values
- Elasticsearch: full-text and indexed search for blocks, transactions, and proposals

If any of these services are unavailable, the backend falls back to in-memory mode so the demo can still run.

## Project Layout

```text
Evochain/
|-- backend/
|   `-- ai-service/
|-- docs/
|-- evochain/
|-- frontend/
|   `-- dashboard/
|-- scripts/
`-- shared/
    `-- contracts/
```

## Quick Start

### One-command launcher

This is the fastest way to open the full local demo in separate PowerShell windows:

```powershell
Set-Location s:\code\Evochain\Evochain
.\scripts\launch-demo.ps1
```

What it starts:

- AI service
- Dashboard
- Rust miner on `6000`
- Rust validators on `6001` and `6002`

By default the launcher also starts MongoDB, Redis, and Elasticsearch through Docker Compose if Docker is installed. Useful options:

```powershell
.\scripts\launch-demo.ps1 -SkipInstalls
.\scripts\launch-demo.ps1 -SkipDockerInfra
```

To stop everything started by the launcher:

```powershell
.\scripts\stop-demo.ps1
```

### Option 1: Start the platform stack with Docker Compose

This brings up MongoDB, Redis, Elasticsearch, the FastAPI service, and the dashboard.

```powershell
Set-Location s:\code\Evochain\Evochain
docker compose up --build
```

Services exposed locally:

- AI service: `http://localhost:8000`
- Dashboard: `http://localhost:4173`
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`
- Elasticsearch: `http://localhost:9200`

### Option 2: Run services manually

#### 1. Start the AI service

```powershell
Set-Location s:\code\Evochain\Evochain\backend\ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Start the dashboard

```powershell
Set-Location s:\code\Evochain\Evochain\frontend\dashboard
npm install
Copy-Item .env.example .env
npm run dev
```

#### 3. Start the Rust nodes

```powershell
Set-Location s:\code\Evochain\Evochain\evochain
$env:EVOCHAIN_AI_URL="http://127.0.0.1:8000"
cargo run -- 6000
```

```powershell
Set-Location s:\code\Evochain\Evochain\evochain
cargo run -- 6001
```

```powershell
Set-Location s:\code\Evochain\Evochain\evochain
cargo run -- 6002
```

Or use the helper script:

```powershell
Set-Location s:\code\Evochain\Evochain
.\scripts\run-nodes.ps1
```

## Database Connection Instructions

### Backend environment variables

Copy `backend/ai-service/.env.example` to `.env` and set:

- `MONGODB_URI`
- `MONGODB_DB`
- `REDIS_URL`
- `ELASTICSEARCH_URL`
- `USE_MONGO`
- `USE_REDIS`
- `USE_ELASTICSEARCH`

Example local values:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=evochain
REDIS_URL=redis://localhost:6379/0
ELASTICSEARCH_URL=http://localhost:9200
USE_MONGO=true
USE_REDIS=true
USE_ELASTICSEARCH=true
```

### Dashboard environment variable

Copy `frontend/dashboard/.env.example` to `.env`:

```env
VITE_AI_API_URL=http://localhost:8000
```

### Recommended production-style mapping

- MongoDB Atlas or self-hosted replica set for durable platform records
- Redis Cloud or managed Redis for cache and online RL state
- Elastic Cloud or self-hosted Elasticsearch for explorer and proposal search

To connect managed services, replace the local URLs with the provider connection strings and restart the AI service.

## AI Model Roles

### ARIMA Forecaster

The forecaster predicts:

- next mempool size
- expected network load
- short-term trend classification: `rising`, `stable`, or `cooling`

Implementation details:

- uses `statsmodels` ARIMA when enough telemetry history exists
- falls back to a slope-aware heuristic when the sample window is short or noisy

### RL Agent

The RL controller selects the next action for:

- block size
- gas price

Implementation details:

- lightweight online Q-learning
- state buckets based on mempool, predicted load, latency, peer count, and trend
- reward update from observed throughput, latency, load pressure, and mempool growth
- Redis-backed Q-value persistence when Redis is available

## Data Flow

1. The Rust miner collects telemetry after a block is mined.
2. The node sends telemetry to `POST /optimize`.
3. The AI service forecasts load and chooses a safe action.
4. The Rust node applies the returned config to the next block.
5. The node posts the full block, transactions, telemetry snapshot, and optimization metadata to `POST /api/ingest/node-state`.
6. MongoDB, Redis, and Elasticsearch are updated.
7. The dashboard reads the same records through the platform APIs.

## Verification

Validated locally with:

- `cargo test` in `evochain/`
- `python -m pytest` in `backend/ai-service/`
- `npm run build` in `frontend/dashboard/`

## Notes

- The Rust peer-to-peer nodes still run most naturally on the local machine rather than inside isolated containers.
- The dashboard is based on the supplied frontend zip, but the data layer was rebuilt to match this repo's live APIs and shared contracts.
- If you run the backend without MongoDB, Redis, or Elasticsearch, the service stays available in memory-only mode for demo use.
