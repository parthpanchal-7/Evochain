from fastapi import APIRouter

from app.core.runtime import get_runtime


router = APIRouter(tags=["health"])


@router.get("/health")
def healthcheck() -> dict[str, object]:
    runtime = get_runtime()
    settings = runtime.settings
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.version,
        "mode": runtime.repository.mode(),
        "dependencies": runtime.repository.dependency_status(),
    }
