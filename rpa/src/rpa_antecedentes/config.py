"""Configuración por variables de entorno (12-factor), sobrescribible desde la CLI."""

import os
from dataclasses import dataclass
from pathlib import Path


def _bool(value: str | None, default: bool) -> bool:
    return default if value is None else value.strip().lower() in {"1", "true", "yes", "si", "sí"}


@dataclass(frozen=True, slots=True)
class Settings:
    service_url: str
    timeout_s: float
    max_reintentos: int
    backoff_base_s: float
    backoff_max_s: float
    input_path: Path
    output_path: Path
    log_dir: Path
    enmascarar_logs: bool

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            service_url=os.getenv("ANTECEDENTES_SERVICE_URL", "http://localhost:8000").rstrip("/"),
            timeout_s=float(os.getenv("RPA_TIMEOUT_S", "3")),
            max_reintentos=int(os.getenv("RPA_MAX_REINTENTOS", "3")),
            backoff_base_s=float(os.getenv("RPA_BACKOFF_BASE_S", "0.5")),
            backoff_max_s=float(os.getenv("RPA_BACKOFF_MAX_S", "8")),
            input_path=Path(os.getenv("RPA_INPUT", "data/cedulas.xlsx")),
            output_path=Path(os.getenv("RPA_OUTPUT", "output/reporte_antecedentes.xlsx")),
            log_dir=Path(os.getenv("RPA_LOG_DIR", "logs")),
            enmascarar_logs=_bool(os.getenv("RPA_ENMASCARAR_LOGS"), default=True),
        )
