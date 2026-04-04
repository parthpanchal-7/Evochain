import os
from dataclasses import dataclass
from functools import lru_cache


def _env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_name: str = "EvoChain AI Service"
    version: str = "0.3.0"
    host: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    min_block_size: int = int(os.getenv("AI_MIN_BLOCK_SIZE", "1"))
    max_block_size: int = int(os.getenv("AI_MAX_BLOCK_SIZE", "8"))
    min_gas_price: int = int(os.getenv("AI_MIN_GAS_PRICE", "1"))
    max_gas_price: int = int(os.getenv("AI_MAX_GAS_PRICE", "10"))
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db: str = os.getenv("MONGODB_DB", "evochain")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    elasticsearch_url: str = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    use_mongo: bool = _env_bool("USE_MONGO", "true")
    use_redis: bool = _env_bool("USE_REDIS", "true")
    use_elasticsearch: bool = _env_bool("USE_ELASTICSEARCH", "true")
    arima_min_points: int = int(os.getenv("AI_ARIMA_MIN_POINTS", "6"))
    rl_learning_rate: float = float(os.getenv("AI_RL_LEARNING_RATE", "0.22"))
    rl_discount_factor: float = float(os.getenv("AI_RL_DISCOUNT_FACTOR", "0.78"))
    rl_exploration_rate: float = float(os.getenv("AI_RL_EXPLORATION_RATE", "0.12"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
