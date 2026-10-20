import logging
import re
import socket

import pytest
import requests
import responses

from rpa_antecedentes.client import HttpAntecedentesClient
from rpa_antecedentes.models import Estado

BASE = "http://antecedentes.test"
URL = re.compile(rf"{BASE}/api/v1/antecedentes/\d+")


def ok(nombres: str = "Ana Gómez", antecedentes: bool = False, detalle: str = "Sin antecedentes registrados") -> dict:
    return {"cedula": "1032456781", "nombres": nombres, "tiene_antecedentes": antecedentes, "detalle": detalle}


@pytest.fixture
def cliente(esperas, reloj_fijo) -> HttpAntecedentesClient:
    return HttpAntecedentesClient(
        BASE, timeout_s=1, max_reintentos=3, backoff_base_s=0.5, sleep=esperas.append, reloj=reloj_fijo
    )


class TestRespuestasDelServicio:
    @responses.activate
    def test_sin_antecedentes_es_limpio(self, cliente) -> None:
        responses.get(URL, json=ok())

        resultado = cliente.consultar("1032456781")

        assert resultado.estado is Estado.LIMPIO
        assert resultado.nombres == "Ana Gómez"
        assert resultado.cedula == "1032456781"

    @responses.activate
    def test_con_antecedentes(self, cliente) -> None:
        responses.get(URL, json=ok(antecedentes=True, detalle="Sanción vigente"))

        resultado = cliente.consultar("1032456781")

        assert resultado.estado is Estado.CON_ANTECEDENTES
        assert resultado.detalle == "Sanción vigente"

    @responses.activate
    def test_404_es_no_encontrado_y_no_se_reintenta(self, cliente, esperas) -> None:
        responses.get(URL, status=404, json={"detail": "Cédula no registrada"})

        resultado = cliente.consultar("1032456781")

        assert resultado.estado is Estado.NO_ENCONTRADO
        assert len(responses.calls) == 1
        assert esperas == []


class TestReintentos:
    @responses.activate
    def test_503_transitorio_se_reintenta_hasta_obtener_respuesta(self, cliente, esperas) -> None:
        responses.get(URL, status=503)
        responses.get(URL, status=503)
        responses.get(URL, json=ok())

        resultado = cliente.consultar("1032456781")

        assert resultado.estado is Estado.LIMPIO
        assert len(responses.calls) == 3
        assert len(esperas) == 2

    @responses.activate
    def test_espera_exponencial_entre_intentos(self, cliente, esperas) -> None:
        responses.get(URL, status=500)

        cliente.consultar("1032456781")

        # base 0.5 s → 0.5, 1.0, 2.0 (±20 % de jitter)
        for espera, esperado in zip(esperas, [0.5, 1.0, 2.0], strict=True):
            assert esperado * 0.8 <= espera <= esperado * 1.2

    @responses.activate
    def test_error_persistente_agota_reintentos_y_devuelve_error(self, cliente) -> None:
        responses.get(URL, status=500)

        resultado = cliente.consultar("1032456781")

        assert resultado.estado is Estado.ERROR
        assert len(responses.calls) == 4  # 1 intento + 3 reintentos
        assert "tras 4 intentos" in resultado.detalle and "HTTP 500" in resultado.detalle

    @responses.activate
    def test_timeout_se_trata_como_transitorio(self, cliente) -> None:
        responses.get(URL, body=requests.Timeout("lento"))
        responses.get(URL, json=ok())

        assert cliente.consultar("1032456781").estado is Estado.LIMPIO
        assert len(responses.calls) == 2

    @responses.activate
    def test_timeout_de_conexion_se_reporta_como_servicio_inalcanzable(self, cliente) -> None:
        # Windows no rechaza al instante un puerto cerrado: reintenta el SYN y el cliente
        # agota el timeout de conexión (ConnectTimeout) antes de recibir "connection refused"
        responses.get(URL, body=requests.ConnectTimeout("sin respuesta"))

        resultado = cliente.consultar("1032456781")

        assert resultado.estado is Estado.ERROR
        assert "no se pudo conectar" in resultado.detalle

    @responses.activate
    def test_429_rate_limit_se_reintenta(self, cliente) -> None:
        responses.get(URL, status=429)
        responses.get(URL, json=ok())

        assert cliente.consultar("1032456781").estado is Estado.LIMPIO

    def test_backoff_respeta_el_tope_maximo(self) -> None:
        cliente = HttpAntecedentesClient(BASE, backoff_base_s=1, backoff_max_s=4)

        assert cliente.calcular_espera(10) <= 4 * 1.2


class TestErroresNoRecuperables:
    @responses.activate
    def test_400_no_se_reintenta(self, cliente, esperas) -> None:
        responses.get(URL, status=400)

        resultado = cliente.consultar("1032456781")

        assert resultado.estado is Estado.ERROR
        assert len(responses.calls) == 1 and esperas == []

    @responses.activate
    def test_respuesta_con_formato_inesperado(self, cliente) -> None:
        responses.get(URL, body="<html>mantenimiento</html>", status=200)

        resultado = cliente.consultar("1032456781")

        assert resultado.estado is Estado.ERROR
        assert "formato inesperado" in resultado.detalle

    @responses.activate
    def test_campo_tiene_antecedentes_con_tipo_incorrecto(self, cliente) -> None:
        responses.get(URL, json={"nombres": "X", "tiene_antecedentes": "si"})

        assert cliente.consultar("1032456781").estado is Estado.ERROR


class TestServicioCaido:
    def test_servicio_caido_real_agota_reintentos_sin_lanzar_excepcion(self, esperas, reloj_fijo) -> None:
        # Puerto libre en localhost sin nadie escuchando → ConnectionError real (no simulado)
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            puerto = s.getsockname()[1]
        cliente = HttpAntecedentesClient(
            f"http://127.0.0.1:{puerto}", timeout_s=1, max_reintentos=2, sleep=esperas.append, reloj=reloj_fijo
        )

        resultado = cliente.consultar("1032456781")

        assert resultado.estado is Estado.ERROR
        assert "no se pudo conectar" in resultado.detalle
        assert len(esperas) == 2


class TestLog:
    @responses.activate
    def test_cada_consulta_queda_en_el_log_con_la_cedula_enmascarada(self, cliente, caplog) -> None:
        responses.get(URL, status=503)
        responses.get(URL, json=ok())

        with caplog.at_level(logging.INFO, logger="rpa_antecedentes.client"):
            cliente.consultar("1032456781")

        mensajes = [r.getMessage() for r in caplog.records]
        assert any("intento=1/4 fallo transitorio" in m for m in mensajes)
        assert any("intento=2/4 estado='limpio'" in m for m in mensajes)
        assert all("1032456781" not in m for m in mensajes)
        assert any("10******81" in m for m in mensajes)
