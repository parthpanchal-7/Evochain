import os

import pytest


os.environ["USE_MONGO"] = "false"
os.environ["USE_REDIS"] = "false"
os.environ["USE_ELASTICSEARCH"] = "false"

from app.core.config import get_settings
from app.core.runtime import get_runtime


@pytest.fixture(autouse=True)
def isolate_runtime(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("USE_MONGO", "false")
    monkeypatch.setenv("USE_REDIS", "false")
    monkeypatch.setenv("USE_ELASTICSEARCH", "false")
    get_settings.cache_clear()
    get_runtime.cache_clear()
    yield
    get_runtime.cache_clear()
    get_settings.cache_clear()
