from pydantic import BaseModel, Field


class TelemetrySnapshot(BaseModel):
    mempool_size: int = Field(ge=0)
    avg_gas_price: int = Field(ge=0)
    avg_block_time_ms: float = Field(ge=0)
    network_load: float = Field(ge=0, le=1)
    throughput_tps: float = Field(ge=0)
    last_block_size: int = Field(ge=1)
    peer_count: int = Field(ge=0)
    chain_height: int = Field(ge=0)


class OptimizationRequest(BaseModel):
    node_id: str
    snapshot: TelemetrySnapshot
    history: list[TelemetrySnapshot] = Field(default_factory=list)

