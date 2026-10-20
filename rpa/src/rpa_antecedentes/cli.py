"""Punto de entrada por línea de comandos."""

import argparse
import logging
import sys
from pathlib import Path

from . import __version__
from .client import HttpAntecedentesClient
from .config import Settings
from .logging_config import configurar_logging
from .pipeline import ejecutar
from .reader import ArchivoEntradaError
from .report import formatear_resumen

EXIT_OK = 0
EXIT_ERROR_INESPERADO = 1
EXIT_ENTRADA_INVALIDA = 2

logger = logging.getLogger("rpa_antecedentes")


def construir_parser(defaults: Settings) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="rpa-antecedentes",
        description="Consulta antecedentes de las cédulas de un Excel en el servicio simulado y genera un reporte.",
    )
    parser.add_argument("-i", "--input", type=Path, default=defaults.input_path, help="Excel con la columna 'cedula'")
    parser.add_argument("-o", "--output", type=Path, default=defaults.output_path, help="Ruta del reporte .xlsx")
    parser.add_argument("--service-url", default=defaults.service_url, help="URL base del servicio de antecedentes")
    parser.add_argument("--timeout", type=float, default=defaults.timeout_s, help="Timeout por intento (segundos)")
    parser.add_argument("--max-reintentos", type=int, default=defaults.max_reintentos, help="Reintentos por consulta")
    parser.add_argument("--log-dir", type=Path, default=defaults.log_dir, help="Carpeta de los archivos de log")
    parser.add_argument("--sin-enmascarar", action="store_true", help="Muestra las cédulas completas en el log")
    parser.add_argument("-v", "--verbose", action="store_true", help="Log en nivel DEBUG")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    return parser


def main(argv: list[str] | None = None) -> int:
    defaults = Settings.from_env()
    args = construir_parser(defaults).parse_args(argv)

    archivo_log = configurar_logging(args.log_dir, logging.DEBUG if args.verbose else logging.INFO)
    logger.info("Inicio del RPA v%s | servicio=%s | entrada=%s", __version__, args.service_url, args.input)

    cliente = HttpAntecedentesClient(
        args.service_url,
        timeout_s=args.timeout,
        max_reintentos=args.max_reintentos,
        backoff_base_s=defaults.backoff_base_s,
        backoff_max_s=defaults.backoff_max_s,
        enmascarar_logs=defaults.enmascarar_logs and not args.sin_enmascarar,
    )

    try:
        resumen = ejecutar(args.input, args.output, cliente)
    except ArchivoEntradaError as error:
        logger.error("Archivo de entrada inválido: %s", error)
        return EXIT_ENTRADA_INVALIDA
    except Exception:  # noqa: BLE001 — último recurso: registrar y salir con código de error
        logger.exception("El RPA terminó por un error inesperado")
        return EXIT_ERROR_INESPERADO

    print(formatear_resumen(resumen))
    print(f" Reporte : {args.output}")
    print(f" Log     : {archivo_log}\n")
    logger.info("Fin del RPA | %s", resumen)
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
