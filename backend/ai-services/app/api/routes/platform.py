from fastapi import APIRouter

from app.core.runtime import get_runtime
from app.schemas.platform import (
    AIInsightsResponse,
    DashboardSummary,
    GovernanceProposal,
    GovernanceProposalCreate,
    IngestAcknowledgement,
    NetworkOverview,
    NodeStateIngestRequest,
    SearchResponse,
    SecurityAlert,
)


router = APIRouter(prefix="/api", tags=["platform"])


@router.post("/ingest/node-state", response_model=IngestAcknowledgement)
def ingest_node_state(payload: NodeStateIngestRequest) -> IngestAcknowledgement:
    runtime = get_runtime()
    alerts_created = runtime.repository.ingest_node_state(payload)
    return IngestAcknowledgement(
        status="stored",
        stored_block_hash=payload.block.hash,
        alerts_created=alerts_created,
    )


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary() -> DashboardSummary:
    return get_runtime().repository.get_dashboard_summary()


@router.get("/network/overview", response_model=NetworkOverview)
def network_overview() -> NetworkOverview:
    return get_runtime().repository.get_network_overview()


@router.get("/blocks")
def list_blocks(limit: int = 20):
    return get_runtime().repository.get_recent_blocks(limit=limit)


@router.get("/transactions")
def list_transactions(limit: int = 20, q: str | None = None):
    return get_runtime().repository.get_recent_transactions(limit=limit, query=q)


@router.get("/search", response_model=SearchResponse)
def search(q: str, limit: int = 12) -> SearchResponse:
    return get_runtime().repository.search(q, limit=limit)


@router.get("/ai/insights", response_model=AIInsightsResponse)
def ai_insights() -> AIInsightsResponse:
    runtime = get_runtime()
    return runtime.repository.build_ai_insights(runtime.optimizer.model_status())


@router.get("/security/alerts", response_model=list[SecurityAlert])
def security_alerts(limit: int = 20) -> list[SecurityAlert]:
    return get_runtime().repository.get_security_alerts(limit=limit)


@router.get("/governance/proposals", response_model=list[GovernanceProposal])
def governance_proposals(limit: int = 20) -> list[GovernanceProposal]:
    return get_runtime().repository.get_governance_proposals(limit=limit)


@router.post("/governance/proposals", response_model=GovernanceProposal)
def create_governance_proposal(payload: GovernanceProposalCreate) -> GovernanceProposal:
    return get_runtime().repository.create_governance_proposal(payload)
