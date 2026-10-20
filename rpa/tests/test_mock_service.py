"""Pruebas del servicio simulado (se omiten si sus dependencias no están instaladas)."""

import importlib
import sys
from pathlib import Path

import pytest

# El servicio simulado tiene sus propias dependencias (mock_service/requirements.txt).
# Solo se omite si falta una dependencia; cualquier otro error de import falla de forma visible.
pytest.importorskip("fastapi", reason="instala mock_service/requirements.txt")
pytest.importorskip("httpx2", reason="instala las dependencias de desarrollo: pip install -e '.[dev]'")
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture
def client(monkeypatch) -> TestClient:
    monkeypatch.setenv("FAILURE_RATE", "0")
    monkeypatch.setenv("LATENCY_MS", "0")
    monkeypatch.setenv("SLOW_DELAY_S", "0")
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parents[1] / "mock_service"))
    sys.modules.pop("app", None)
    return TestClient(importlib.import_module("app").app)


def test_respuesta_determinista_para_la_misma_cedula(client) -> None:
    primera = client.get("/api/v1/antecedentes/1032456781").json()
    segunda = client.get("/api/v1/antecedentes/1032456781").json()

    assert primera["nombres"] == segunda["nombres"]
    assert primera["tiene_antecedentes"] == segunda["tiene_antecedentes"]


def test_cedula_terminada_en_13_falla_dos_veces_y_luego_responde(client) -> None:
    codigos = [client.get("/api/v1/antecedentes/1045678913").status_code for _ in range(3)]

    assert codigos == [503, 503, 200]


def test_cedula_terminada_en_99_siempre_falla(client) -> None:
    assert client.get("/api/v1/antecedentes/1056789099").status_code == 500


def test_rechaza_formato_invalido(client) -> None:
    assert client.get("/api/v1/antecedentes/12AB").status_code == 422
