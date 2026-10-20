"""
Genera data/cedulas.xlsx con datos FICTICIOS que cubren todos los casos del RPA:
válidas (limpio / con antecedentes / no encontrado), duplicadas, inválidas y
cédulas especiales que el servicio simulado usa para inyectar fallos.

Uso: python scripts/generar_cedulas_ejemplo.py [ruta_salida]
"""

import sys
from pathlib import Path

from openpyxl import Workbook

CEDULAS: list[object] = [
    "1032456781",      # válidas: el servicio decide limpio / con antecedentes / no encontrado
    "79845612",
    "52987431",
    "1010203040",
    "1144556604",      # el servicio la reporta como no encontrada
    "80123456",
    "43567890",
    "1020304050",
    "65432109",
    "1098765432",
    "39876543",
    "1122334455",
    1023456789,        # número en la celda (no texto): se normaliza
    " 71234567 ",      # espacios alrededor: se recortan
    "1032456781",      # duplicado
    79845612,          # duplicado (numérico vs texto)
    "1010203040",      # duplicado
    "12345",           # inválida: 5 dígitos
    "12345678901",     # inválida: 11 dígitos
    "1.234.567",       # inválida: con puntos
    "CC10203040",      # inválida: letras
    "1045678913",      # especial ...13: dos 503 y luego responde (reintento exitoso)
    "1056789099",      # especial ...99: siempre 500 (agota reintentos → error)
    "1067890177",      # especial ...77: más lenta que el timeout (timeouts → error)
]


def main() -> None:
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/cedulas.xlsx")
    destino.parent.mkdir(parents=True, exist_ok=True)
    libro = Workbook()
    hoja = libro.active
    assert hoja is not None
    hoja.title = "Cedulas"
    hoja.append(["cedula"])
    for cedula in CEDULAS:
        hoja.append([cedula])
    hoja.column_dimensions["A"].width = 16
    libro.save(destino)
    print(f"Archivo de ejemplo generado: {destino} ({len(CEDULAS)} filas)")


if __name__ == "__main__":
    main()
