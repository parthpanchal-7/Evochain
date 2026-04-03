from datetime import datetime

from pydantic import BaseModel, Field


class ForecastSummary(BaseModel):
    predicted_mempool_size: int = Field(ge=0)
    predicted_load: float = Field(ge=0, le=1)
    trend: str
    model: str = "hybrid-arima"
    confidence: float = Field(default=0.5, ge=0, le=1)


class OptimizationDecision(BaseModel):
    block_size: int = Field(ge=1)
    gas_price: int = Field(ge=1)
    confidence: float = Field(ge=0, le=1)
    rationale: list[str] = Field(default_factory=list)
    policy: str = "rl-q-learning"


class OptimizationResponse(BaseModel):
    node_id: str
    generated_at: datetime
    forecast: ForecastSummary
    decision: OptimizationDecision
    simulation_status: str
