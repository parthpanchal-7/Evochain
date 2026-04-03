from app.schemas.optimization import OptimizationDecision
from app.schemas.telemetry import TelemetrySnapshot


def _clamp(value: int, lower: int, upper: int) -> int:
    return max(lower, min(upper, value))


class SimulationGuard:
    def __init__(
        self,
        min_block_size: int,
        max_block_size: int,
        min_gas_price: int,
        max_gas_price: int,
    ) -> None:
        self.min_block_size = min_block_size
        self.max_block_size = max_block_size
        self.min_gas_price = min_gas_price
        self.max_gas_price = max_gas_price

    def evaluate(
        self,
        snapshot: TelemetrySnapshot,
        decision: OptimizationDecision,
    ) -> tuple[OptimizationDecision, str]:
        adjusted_block_size = _clamp(
            decision.block_size,
            self.min_block_size,
            self.max_block_size,
        )
        adjusted_gas_price = _clamp(
            decision.gas_price,
            self.min_gas_price,
            self.max_gas_price,
        )

        status = "accepted"
        rationale = list(decision.rationale)

        if abs(adjusted_block_size - snapshot.last_block_size) > 2:
            adjusted_block_size = snapshot.last_block_size + (
                2 if adjusted_block_size > snapshot.last_block_size else -2
            )
            status = "adjusted"
            rationale.append("Simulation guard limited the block size delta to keep changes smooth.")

        if adjusted_gas_price == self.min_gas_price and snapshot.network_load > 0.85:
            rationale.append("Simulation guard kept gas at the floor to avoid extra congestion pressure.")

        safe_decision = decision.model_copy(
            update={
                "block_size": adjusted_block_size,
                "gas_price": adjusted_gas_price,
                "rationale": rationale,
            }
        )

        return safe_decision, status

