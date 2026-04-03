from datetime import datetime, timezone

from app.core.config import Settings
from app.schemas.optimization import OptimizationResponse
from app.schemas.platform import OptimizationRecord
from app.schemas.telemetry import OptimizationRequest
from app.services.arima_forecaster import ArimaForecaster
from app.services.rl_agent import QValueStore, RLAgent
from app.services.simulation import SimulationGuard


class OptimizerService:
    def __init__(self, settings: Settings, repository) -> None:
        self.repository = repository
        self.forecaster = ArimaForecaster(min_points=settings.arima_min_points)
        self.agent = RLAgent(
            min_block_size=settings.min_block_size,
            max_block_size=settings.max_block_size,
            min_gas_price=settings.min_gas_price,
            max_gas_price=settings.max_gas_price,
            learning_rate=settings.rl_learning_rate,
            discount_factor=settings.rl_discount_factor,
            exploration_rate=settings.rl_exploration_rate,
            q_store=QValueStore(repository.redis_client),
        )
        self.guard = SimulationGuard(
            min_block_size=settings.min_block_size,
            max_block_size=settings.max_block_size,
            min_gas_price=settings.min_gas_price,
            max_gas_price=settings.max_gas_price,
        )

    def optimize(self, payload: OptimizationRequest) -> OptimizationResponse:
        recent_history = self.repository.get_recent_telemetry(payload.node_id, limit=24)
        forecast = self.forecaster.forecast(payload, recent_history)
        previous_record = self.repository.get_latest_optimization(payload.node_id)
        reward = self.agent.update_with_observation(previous_record, payload.snapshot, forecast)
        decision = self.agent.propose(payload, forecast)
        safe_decision, simulation_status = self.guard.evaluate(payload.snapshot, decision)

        self.repository.record_telemetry_sample(
            payload.node_id,
            payload.snapshot,
            source="optimizer-request",
        )

        response = OptimizationResponse(
            node_id=payload.node_id,
            generated_at=datetime.now(timezone.utc),
            forecast=forecast,
            decision=safe_decision,
            simulation_status=simulation_status,
        )
        self.repository.record_optimization(
            OptimizationRecord(
                node_id=payload.node_id,
                generated_at=response.generated_at,
                forecast=forecast,
                decision=safe_decision,
                simulation_status=simulation_status,
                snapshot=payload.snapshot,
                reward=reward,
            )
        )
        return response

    def model_status(self) -> dict[str, object]:
        return {
            "forecast": self.forecaster.status(),
            "policy": self.agent.status(),
            "guardrails": {
                "type": "simulation-guard",
            },
        }
