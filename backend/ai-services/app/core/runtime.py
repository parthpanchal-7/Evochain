from dataclasses import dataclass
from functools import lru_cache

from app.core.config import Settings, get_settings
from app.repositories.platform import PlatformRepository
from app.services.optimizer import OptimizerService


@dataclass
class Runtime:
    settings: Settings
    repository: PlatformRepository
    optimizer: OptimizerService


@lru_cache
def get_runtime() -> Runtime:
    settings = get_settings()
    repository = PlatformRepository(settings)
    optimizer = OptimizerService(settings, repository)
    return Runtime(settings=settings, repository=repository, optimizer=optimizer)
