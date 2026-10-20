"""
Cliente HTTP del servicio de antecedentes con reintentos y espera exponencial.

Patrón Adapter: el pipeline depende del protocolo `AntecedentesClient`, no de esta
implementación. Un adaptador para un canal oficial (con autorización del titular)
podría reemplazarla sin tocar el resto del RPA.
"""

import logging
import random
import time
from collections.abc import Callable
from datetime import datetime
from typing import Protocol

import requests

from .logging_config import enmascarar
from .models import Estado, ResultadoConsulta

logger = logging.getLogger(__name__)

# 429 (rate limit) y 5xx son transitorios: tiene sentido reintentar
CODIGOS_REINTENTABLES = frozenset({429, 500, 502, 503, 504})


class AntecedentesClient(Protocol):
    def consultar(self, cedula: str) -> ResultadoConsulta: ...


class _ErrorTransitorio(Exception):
    """Fallo que justifica un reintento (red, timeout, 5xx, 429)."""


class _ErrorDefinitivo(Exception):
    """Fallo que no se corrige reintentando (4xx distinto de 404/429, JSON inválido)."""


class HttpAntecedentesClient:
    def __init__(
        self,
        base_url: str,
        *,
        timeout_s: float = 3.0,
        max_reintentos: int = 3,
        backoff_base_s: float = 0.5,
        backoff_max_s: float = 8.0,
        enmascarar_logs: bool = True,
        session: requests.Session | None = None,
        sleep: Callable[[float], None] = time.sleep,
        reloj: Callable[[], datetime] = datetime.now,
    ) -> None:
        self._url = base_url.rstrip("/")
        self._timeout = timeout_s
        self._max_reintentos = max_reintentos
        self._backoff_base = backoff_base_s
        self._backoff_max = backoff_max_s
        self._enmascarar = enmascarar_logs
        self._session = session or requests.Session()
        # sleep y reloj inyectables: las pruebas verifican el backoff sin esperar de verdad
        self._sleep = sleep
        self._reloj = reloj

    def calcular_espera(self, intento: int) -> float:
        """Backoff exponencial con jitter: base·2^(n-1) ± 20 %, con tope. Evita reintentos sincronizados."""
        espera = min(self._backoff_base * 2 ** (intento - 1), self._backoff_max)
        return espera * random.uniform(0.8, 1.2)

    def consultar(self, cedula: str) -> ResultadoConsulta:
        etiqueta = enmascarar(cedula) if self._enmascarar else cedula
        intentos_totales = self._max_reintentos + 1
        ultimo_error = ""

        for intento in range(1, intentos_totales + 1):
            inicio = time.perf_counter()
            try:
                resultado = self._intentar(cedula)
                logger.info(
                    "Consulta cedula=%s intento=%d/%d estado='%s' duracion=%dms",
                    etiqueta, intento, intentos_totales, resultado.estado, (time.perf_counter() - inicio) * 1000,
                )
                return resultado
            except _ErrorTransitorio as error:
                ultimo_error = str(error)
                if intento == intentos_totales:
                    break
                espera = self.calcular_espera(intento)
                logger.warning(
                    "Consulta cedula=%s intento=%d/%d fallo transitorio: %s | reintento en %.2fs",
                    etiqueta, intento, intentos_totales, ultimo_error, espera,
                )
                self._sleep(espera)
            except _ErrorDefinitivo as error:
                logger.error("Consulta cedula=%s fallo no recuperable: %s", etiqueta, error)
                return self._error(cedula, str(error))

        logger.error(
            "Consulta cedula=%s agotó %d intentos. Último error: %s", etiqueta, intentos_totales, ultimo_error
        )
        return self._error(cedula, f"Servicio no disponible tras {intentos_totales} intentos: {ultimo_error}")

    def _intentar(self, cedula: str) -> ResultadoConsulta:
        try:
            respuesta = self._session.get(f"{self._url}/api/v1/antecedentes/{cedula}", timeout=self._timeout)
        except requests.ConnectTimeout as error:
            # Va primero: ConnectTimeout hereda de Timeout y de ConnectionError a la vez
            raise _ErrorTransitorio(f"no se pudo conectar con el servicio (sin respuesta en {self._timeout}s)") from error
        except requests.Timeout as error:
            raise _ErrorTransitorio(f"timeout tras {self._timeout}s esperando la respuesta") from error
        except requests.ConnectionError as error:
            raise _ErrorTransitorio("no se pudo conectar con el servicio") from error

        if respuesta.status_code == 404:
            return ResultadoConsulta(cedula, "", Estado.NO_ENCONTRADO, "Cédula no registrada en el servicio", self._reloj())
        if respuesta.status_code in CODIGOS_REINTENTABLES:
            raise _ErrorTransitorio(f"HTTP {respuesta.status_code}")
        if not respuesta.ok:
            raise _ErrorDefinitivo(f"HTTP {respuesta.status_code}: respuesta rechazada por el servicio")

        try:
            datos = respuesta.json()
            tiene_antecedentes = datos["tiene_antecedentes"]
            nombres = str(datos.get("nombres", "")).strip()
            detalle = str(datos.get("detalle", "")).strip()
        except (ValueError, KeyError, TypeError) as error:
            raise _ErrorDefinitivo("respuesta del servicio con formato inesperado") from error

        if not isinstance(tiene_antecedentes, bool):
            raise _ErrorDefinitivo("campo 'tiene_antecedentes' inválido en la respuesta")

        estado = Estado.CON_ANTECEDENTES if tiene_antecedentes else Estado.LIMPIO
        return ResultadoConsulta(cedula, nombres, estado, detalle, self._reloj())

    def _error(self, cedula: str, detalle: str) -> ResultadoConsulta:
        return ResultadoConsulta(cedula, "", Estado.ERROR, detalle, self._reloj())
