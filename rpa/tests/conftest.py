from collections.abc import Callable
from datetime import datetime
from pathlib import Path

import pytest
from openpyxl import Workbook

FECHA_FIJA = datetime(2026, 10, 20, 9, 30, 0)


@pytest.fixture
def crear_excel(tmp_path: Path) -> Callable[..., Path]:
    """Crea un .xlsx temporal con las columnas y filas indicadas."""

    def _crear(filas: list[list[object]], encabezados: list[str] | None = None, nombre: str = "cedulas.xlsx") -> Path:
        libro = Workbook()
        hoja = libro.active
        assert hoja is not None
        hoja.append(encabezados or ["cedula"])
        for fila in filas:
            hoja.append(fila)
        ruta = tmp_path / nombre
        libro.save(ruta)
        return ruta

    return _crear


@pytest.fixture
def esperas() -> list[float]:
    """Registra las esperas del backoff en lugar de dormir (pruebas rápidas y deterministas)."""
    return []


@pytest.fixture
def reloj_fijo() -> Callable[[], datetime]:
    return lambda: FECHA_FIJA
