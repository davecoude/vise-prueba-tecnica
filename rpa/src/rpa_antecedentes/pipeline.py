"""Orquestador: lector → validador → cliente → reporte. No conoce detalles de HTTP ni de Excel."""

import logging
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from .client import AntecedentesClient
from .logging_config import enmascarar
from .models import Estado, ResultadoConsulta, Resumen
from .reader import leer_cedulas
from .report import escribir_reporte
from .validator import CedulaInvalida, validar

logger = logging.getLogger(__name__)


def ejecutar(
    entrada: Path,
    salida: Path,
    cliente: AntecedentesClient,
    *,
    reloj: Callable[[], datetime] = datetime.now,
) -> Resumen:
    filas = leer_cedulas(entrada)
    validacion = validar(filas)
    invalidas = validacion.invalidas
    logger.info(
        "Validación: %d válidas únicas | %d inválidas | %d duplicados eliminados",
        len(validacion.validas), len(invalidas), validacion.duplicados,
    )

    resultados: list[ResultadoConsulta] = []
    for item in validacion.items:  # mismo orden que el archivo de entrada
        if isinstance(item, CedulaInvalida):
            logger.warning("Fila %d omitida: cédula '%s' %s", item.fila, item.valor, item.motivo)
            resultados.append(
                ResultadoConsulta(
                    cedula=item.valor,
                    nombres="",
                    estado=Estado.ERROR,
                    detalle=f"Cédula inválida (fila {item.fila}): {item.motivo}. No se consultó.",
                    fecha_consulta=reloj(),
                )
            )
            continue

        try:
            resultados.append(cliente.consultar(item.cedula))
        except Exception as error:  # noqa: BLE001 — una consulta nunca debe detener el lote
            logger.exception("Error inesperado consultando cedula=%s", enmascarar(item.cedula))
            resultados.append(
                ResultadoConsulta(item.cedula, "", Estado.ERROR, f"Error inesperado: {error}", reloj())
            )

    resumen = Resumen.desde(resultados, duplicados=validacion.duplicados, invalidas=len(invalidas))
    escribir_reporte(resultados, resumen, salida)
    return resumen
