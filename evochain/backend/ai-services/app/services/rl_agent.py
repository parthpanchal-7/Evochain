from __future__ import annotations

import json
import random
from dataclasses import dataclass
from typing import Any

from app.schemas.optimization import ForecastSummary, OptimizationDecision
from app.schemas.platform import OptimizationRecord
from app.schemas.telemetry import OptimizationRequest, TelemetrySnapshot


def _clamp(value: int, lower: int, upper: int) -> int:
    return max(lower, min(upper, value))


@dataclass(frozen=True)
class Action:
    block_delta: int
    gas_delta: int
    label: str


class QValueStore:
    def __init__(self, redis_client: Any | None = None) -> None:
        self.redis_client = redis_client
        self.memory: dict[str, float] = {}

    def get(self, state: str, action: Action) -> float:
        key = self._key(state, action)
        if self.redis_client is not None:
            raw = self.redis_client.get(key)
            if raw is not None:
                return float(raw)
        return self.memory.get(key, 0.0)

    def set(self, state: str, action: Action, value: float) -> None:
        key = self._key(state, action)
        self.memory[key] = value
        if self.redis_client is not None:
            self.redis_client.set(key, value)

    def stats(self) -> dict[str, int]:
        return {"states": len(self.memory)}

    def _key(self, state: str, action: Action) -> str:
        payload = {"state": state, "action": action.label}
        return f"evochain:rl:{json.dumps(payload, sort_keys=True)}"


class RLAgent:
    """
    Lightweight online Q-learning controller for block size and gas policy.
    """

    ACTIONS = (
        Action(0, 0, "hold"),
        Action(1, 0, "increase_block"),
        Action(-1, 0, "decrease_block"),
        Action(1, -1, "favor_throughput"),
        Action(0, 1, "increase_gas"),
        Action(-1, 1, "tighten_network"),
    )

    def __init__(
        self,
        min_block_size: int,
        max_block_size: int,
        min_gas_price: int,
        max_gas_price: int,
        learning_rate: float,
        discount_factor: float,
        exploration_rate: float,
        q_store: QValueStore | None = None,
    ) -> None:
        self.min_block_size = min_block_size
        self.max_block_size = max_block_size
        self.min_gas_price = min_gas_price
        self.max_gas_price = max_gas_price
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.exploration_rate = exploration_rate
        self.q_store = q_store or QValueStore()

    def propose(
        self,
        payload: OptimizationRequest,
        forecast: ForecastSummary,
    ) -> OptimizationDecision:
        snapshot = payload.snapshot
        state = self._state(snapshot, forecast)
        action = self._choose_action(state)
        rationale = self._rationale(snapshot, forecast, action)

        baseline_gas = max(snapshot.avg_gas_price, self.min_gas_price)
        block_size = _clamp(
            snapshot.last_block_size + action.block_delta,
            self.min_block_size,
            self.max_block_size,
        )
        gas_price = _clamp(
            baseline_gas + action.gas_delta,
            self.min_gas_price,
            self.max_gas_price,
        )

        best_q = max(self.q_store.get(state, candidate) for candidate in self.ACTIONS)
        confidence = 0.48 + min(best_q, 0.35)
        confidence += 0.12 if len(payload.history) >= 2 else 0
        confidence += 0.08 if forecast.confidence >= 0.7 else 0
        confidence -= 0.08 if snapshot.peer_count < 2 else 0
        confidence = max(0.32, min(0.94, round(confidence, 2)))

        return OptimizationDecision(
            block_size=block_size,
            gas_price=gas_price,
            confidence=confidence,
            rationale=rationale,
            policy="rl-q-learning",
        )

    def update_with_observation(
        self,
        previous_record: OptimizationRecord | None,
        current_snapshot: TelemetrySnapshot,
        current_forecast: ForecastSummary,
    ) -> float | None:
        if previous_record is None:
            return None

        previous_state = self._state(previous_record.snapshot, previous_record.forecast)
        previous_action = self._infer_action(previous_record.snapshot, previous_record.decision)
        next_state = self._state(current_snapshot, current_forecast)
        reward = self._reward(previous_record.snapshot, current_snapshot, previous_record.decision)
        current_q = self.q_store.get(previous_state, previous_action)
        best_next = max(self.q_store.get(next_state, action) for action in self.ACTIONS)
        updated = current_q + self.learning_rate * (
            reward + self.discount_factor * best_next - current_q
        )
        self.q_store.set(previous_state, previous_action, round(updated, 4))
        return round(reward, 4)

    def status(self) -> dict[str, object]:
        return {
            "policy": "rl-q-learning",
            "exploration_rate": self.exploration_rate,
            "learning_rate": self.learning_rate,
            "discount_factor": self.discount_factor,
            **self.q_store.stats(),
        }

    def _state(self, snapshot: TelemetrySnapshot, forecast: ForecastSummary) -> str:
        mempool_band = "high" if snapshot.mempool_size >= 60 else "mid" if snapshot.mempool_size >= 25 else "low"
        load_band = "high" if forecast.predicted_load >= 0.75 else "mid" if forecast.predicted_load >= 0.4 else "low"
        block_time_band = "slow" if snapshot.avg_block_time_ms >= 1800 else "fast"
        peer_band = "sparse" if snapshot.peer_count < 2 else "healthy"
        return "|".join([mempool_band, load_band, block_time_band, peer_band, forecast.trend])

    def _choose_action(self, state: str) -> Action:
        if random.random() < self.exploration_rate:
            return random.choice(self.ACTIONS)

        scored = [(self.q_store.get(state, action), action) for action in self.ACTIONS]
        scored.sort(key=lambda item: item[0], reverse=True)
        return scored[0][1]

    def _infer_action(self, snapshot: TelemetrySnapshot, decision: OptimizationDecision) -> Action:
        block_delta = max(-1, min(1, decision.block_size - snapshot.last_block_size))
        baseline_gas = max(snapshot.avg_gas_price, self.min_gas_price)
        gas_delta = max(-1, min(1, decision.gas_price - baseline_gas))
        for action in self.ACTIONS:
            if action.block_delta == block_delta and action.gas_delta == gas_delta:
                return action
        return self.ACTIONS[0]

    def _reward(
        self,
        previous_snapshot: TelemetrySnapshot,
        current_snapshot: TelemetrySnapshot,
        decision: OptimizationDecision,
    ) -> float:
        throughput_gain = current_snapshot.throughput_tps - previous_snapshot.throughput_tps
        block_time_penalty = max(0.0, (current_snapshot.avg_block_time_ms - 1500) / 1000)
        load_penalty = max(0.0, current_snapshot.network_load - 0.82) * 2
        mempool_penalty = max(0.0, current_snapshot.mempool_size - previous_snapshot.mempool_size) / 40
        confidence_bonus = decision.confidence * 0.2
        return throughput_gain * 0.25 - block_time_penalty - load_penalty - mempool_penalty + confidence_bonus

    def _rationale(
        self,
        snapshot: TelemetrySnapshot,
        forecast: ForecastSummary,
        action: Action,
    ) -> list[str]:
        rationale = [
            f"RL policy selected '{action.label}' from the current network state bucket.",
            f"Forecast model {forecast.model} expects a {forecast.trend} trend with load near {forecast.predicted_load:.2f}.",
        ]
        if forecast.predicted_load >= 0.75:
            rationale.append("High predicted load pushes the controller toward throughput-preserving actions.")
        if snapshot.avg_block_time_ms > 1800:
            rationale.append("Recent block latency remains elevated, so aggressive scaling is penalized.")
        if snapshot.peer_count < 2:
            rationale.append("Low peer count reduces policy confidence and favors safer adjustments.")
        return rationale
