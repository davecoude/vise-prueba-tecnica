"""Log con marca de tiempo a consola y a archivo (uno por ejecución)."""

import logging
from datetime import datetime
from pathlib import Path

FORMATO = "%(asctime)s.%(msecs)03d | %(levelname)-8s | %(name)-28s | %(message)s"
FORMATO_FECHA = "%Y-%m-%d %H:%M:%S"


def configurar_logging(log_dir: Path, nivel: int = logging.INFO) -> Path:
    """Configura el logger raíz y devuelve la ruta del archivo de log de esta ejecución."""
    log_dir.mkdir(parents=True, exist_ok=True)
    archivo = log_dir / f"rpa_{datetime.now():%Y%m%d_%H%M%S}.log"

    formatter = logging.Formatter(FORMATO, datefmt=FORMATO_FECHA)
    file_handler = logging.FileHandler(archivo, encoding="utf-8")
    file_handler.setFormatter(formatter)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(nivel)
    root.addHandler(file_handler)
    root.addHandler(console_handler)
    # Las librerías HTTP son muy verbosas en DEBUG/INFO; nuestro cliente ya registra cada intento
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    return archivo


def enmascarar(cedula: str) -> str:
    """Oculta los dígitos centrales (dato personal): 1023456789 → 10******89."""
    if len(cedula) <= 4:
        return "*" * len(cedula)
    return f"{cedula[:2]}{'*' * (len(cedula) - 4)}{cedula[-2:]}"
