from fastapi import APIRouter

from app.core.runtime import get_runtime
from app.schemas.optimization import OptimizationResponse
from app.schemas.telemetry import OptimizationRequest


router = APIRouter(tags=["optimizer"])


@router.post("/optimize", response_model=OptimizationResponse)
def optimize(payload: OptimizationRequest) -> OptimizationResponse:
    return get_runtime().optimizer.optimize(payload)
