z# EvoChain Architecture

## Runtime Pieces

### `evochain/`

The Rust service is the blockchain execution layer. It owns:

- transaction creation and mempool management
- block mining and validation
- chain persistence
- peer discovery and broadcast
- telemetry collection for the AI layer

### `backend/ai-service/`

The Python service is the decision layer. It exposes:

- `GET /health` for service status
- `POST /optimize` for optimization requests

Internally it separates:

- telemetry schemas
- forecasting logic
- policy logic
- simulation guards

This keeps the project ready for future upgrades from placeholder logic to trained RL and ARIMA models.

### `frontend/dashboard/`

The dashboard is a React/Vite app designed for demos. It shows:

- optimizer health
- telemetry snapshot
- current recommendation
- trend narrative for judges

## Integration Flow

1. Rust node captures telemetry.
2. Rust node sends telemetry to the AI service.
3. AI service forecasts load and proposes new block parameters.
4. Safety checks clamp or reject unstable changes.
5. Dashboard visualizes the latest decision and network story.

## Why This Structure

- Clear separation of concerns across execution, intelligence, and presentation.
- Easy to demo locally.
- Easy to extend toward production APIs, model training, and deployment.
