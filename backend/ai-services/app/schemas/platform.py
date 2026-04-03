from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.optimization import ForecastSummary, OptimizationDecision
from app.schemas.telemetry import TelemetrySnapshot


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ChainTransaction(BaseModel):
    hash: str
    sender: str
    recipient: str
    value: int = Field(ge=0)
    gas_price: int = Field(ge=0)
    nonce: int = Field(ge=0)


class ChainBlock(BaseModel):
    index: int = Field(ge=0)
    timestamp_ms: int = Field(ge=0)
    previous_hash: str
    hash: str
    nonce: int = Field(ge=0)
    difficulty: int = Field(ge=0)
    transaction_count: int = Field(ge=0)
    transactions: list[ChainTransaction] = Field(default_factory=list)


class NodeConfigSnapshot(BaseModel):
    block_size: int = Field(ge=1)
    gas_price: int = Field(ge=1)
    difficulty: int = Field(ge=0)


class AppliedOptimization(BaseModel):
    generated_at: datetime
    simulation_status: str
    confidence: float = Field(ge=0, le=1)
    rationale: list[str] = Field(default_factory=list)
    policy: str = "rl-q-learning"


class NodeStateIngestRequest(BaseModel):
    node_id: str
    address: str
    role: Literal["miner", "validator"]
    snapshot: TelemetrySnapshot
    config: NodeConfigSnapshot
    block: ChainBlock
    peer_count: int = Field(ge=0)
    optimization: AppliedOptimization | None = None
    recorded_at: datetime = Field(default_factory=utc_now)


class IngestAcknowledgement(BaseModel):
    status: str
    stored_block_hash: str
    alerts_created: int = Field(ge=0)


class NetworkOverview(BaseModel):
    chain_height: int = Field(ge=0)
    latest_block_hash: str
    pending_transactions: int = Field(ge=0)
    current_gas_price: int = Field(ge=0)
    block_size: int = Field(ge=1)
    avg_block_time_ms: float = Field(ge=0)
    throughput_tps: float = Field(ge=0)
    peer_count: int = Field(ge=0)
    network_load: float = Field(ge=0, le=1)
    latest_forecast_trend: str = "stable"
    optimizer_confidence: float = Field(default=0, ge=0, le=1)
    last_updated: datetime = Field(default_factory=utc_now)
    mode: str = "memory"


class TelemetryPoint(BaseModel):
    timestamp: datetime
    mempool_size: int = Field(ge=0)
    avg_gas_price: int = Field(ge=0)
    avg_block_time_ms: float = Field(ge=0)
    throughput_tps: float = Field(ge=0)
    network_load: float = Field(ge=0, le=1)


class OptimizationRecord(BaseModel):
    node_id: str
    generated_at: datetime
    forecast: ForecastSummary
    decision: OptimizationDecision
    simulation_status: str
    snapshot: TelemetrySnapshot
    reward: float | None = None


class SecurityAlert(BaseModel):
    id: str
    level: Literal["info", "warning", "critical"]
    kind: str
    message: str
    node_id: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    metrics: dict[str, Any] = Field(default_factory=dict)


class GovernanceProposal(BaseModel):
    id: str
    title: str
    summary: str
    category: str
    status: Literal["active", "passed", "rejected"] = "active"
    proposer: str
    votes_for: int = Field(default=0, ge=0)
    votes_against: int = Field(default=0, ge=0)
    ai_recommended: bool = False
    created_at: datetime = Field(default_factory=utc_now)


class GovernanceProposalCreate(BaseModel):
    title: str = Field(min_length=4, max_length=120)
    summary: str = Field(min_length=12, max_length=1000)
    category: str = Field(min_length=3, max_length=40)
    proposer: str = Field(default="community", min_length=2, max_length=60)
    ai_recommended: bool = False


class SearchHit(BaseModel):
    kind: Literal["block", "transaction", "proposal"]
    id: str
    title: str
    subtitle: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit] = Field(default_factory=list)


class AIInsightsResponse(BaseModel):
    latest_optimization: OptimizationRecord | None = None
    recent_optimizations: list[OptimizationRecord] = Field(default_factory=list)
    telemetry_history: list[TelemetryPoint] = Field(default_factory=list)
    model_status: dict[str, Any] = Field(default_factory=dict)
    dependency_status: dict[str, str] = Field(default_factory=dict)


class DashboardSummary(BaseModel):
    overview: NetworkOverview
    recent_blocks: list[ChainBlock] = Field(default_factory=list)
    recent_transactions: list[ChainTransaction] = Field(default_factory=list)
    telemetry_history: list[TelemetryPoint] = Field(default_factory=list)
    latest_optimization: OptimizationRecord | None = None
    alerts: list[SecurityAlert] = Field(default_factory=list)
