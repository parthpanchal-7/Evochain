from __future__ import annotations

import warnings

from statsmodels.tsa.arima.model import ARIMA

from app.schemas.optimization import ForecastSummary
from app.schemas.telemetry import OptimizationRequest, TelemetrySnapshot


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


class ArimaForecaster:
    """
    Hybrid ARIMA forecaster with graceful fallback for short or noisy history.
    """

    def __init__(self, min_points: int = 6) -> None:
        self.min_points = min_points

    def forecast(
        self,
        payload: OptimizationRequest,
        historical_samples: list[TelemetrySnapshot] | None = None,
    ) -> ForecastSummary:
        history = (historical_samples or []) + payload.history
        history = history[-16:]
        samples = history + [payload.snapshot]

        mempool_series = [point.mempool_size for point in samples]
        load_series = [point.network_load for point in samples]
        last_value = mempool_series[-1]
        prior_value = mempool_series[-2] if len(mempool_series) > 1 else last_value
        slope = last_value - prior_value

        model = "heuristic-fallback"
        confidence = 0.45

        predicted_mempool = self._forecast_series(mempool_series)
        predicted_load_raw = self._forecast_series(load_series)

        if len(samples) >= self.min_points:
            model = "arima(1,1,1)"
            confidence = 0.74
        elif len(samples) >= 3:
            confidence = 0.58

        predicted_mempool = max(0, int(round(predicted_mempool)))
        normalized_mempool = _clamp(predicted_mempool / 300, 0, 1)
        predicted_load = round(
            _clamp((predicted_load_raw * 0.55) + (normalized_mempool * 0.45), 0, 1),
            2,
        )

        if slope > 5 or predicted_mempool > last_value + 5:
            trend = "rising"
        elif slope < -5 or predicted_mempool < max(0, last_value - 5):
            trend = "cooling"
        else:
            trend = "stable"

        return ForecastSummary(
            predicted_mempool_size=predicted_mempool,
            predicted_load=predicted_load,
            trend=trend,
            model=model,
            confidence=confidence,
        )

    def status(self) -> dict[str, object]:
        return {
            "model": "hybrid-arima",
            "min_points": self.min_points,
        }

    def _forecast_series(self, series: list[float | int]) -> float:
        if len(series) < self.min_points:
            return self._fallback(series)

        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model = ARIMA(series, order=(1, 1, 1))
                fitted = model.fit()
                forecast = fitted.forecast(steps=1)
                return float(forecast[0])
        except Exception:
            return self._fallback(series)

    def _fallback(self, series: list[float | int]) -> float:
        if not series:
            return 0.0
        if len(series) == 1:
            return float(series[-1])

        short_tail = series[-3:]
        average = sum(float(item) for item in short_tail) / len(short_tail)
        slope = float(series[-1]) - float(series[-2])
        return max(0.0, average + slope * 0.55)
