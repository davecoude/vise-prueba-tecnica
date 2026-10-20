"""
Servicio SIMULADO de consulta de antecedentes.

La prueba exige un servicio simulado con datos ficticios: las consultas reales de
antecedentes requieren autorización del titular y el uso de canales oficiales.
Las respuestas son deterministas (derivadas de la cédula) para que el reporte sea
reproducible, y el servicio inyecta fallos para ejercitar reintentos y backoff.

Cédulas especiales (por sufijo) para demostrar el manejo de errores:
  ...13  → falla con 503 las primeras 2 veces y luego responde (reintento exitoso)
  ...99  → siempre responde 500 (agota los reintentos → estado "error")
  ...77  → tarda más que el timeout del cliente (timeout → reintento)

Variables de entorno:
  FAILURE_RATE  probabilidad (0..1) de un 503 aleatorio adicional. Por defecto 0.1
  LATENCY_MS    latencia base simulada por consulta. Por defecto 150
  SLOW_DELAY_S  demora de las cédulas ...77. Por defecto 6
"""

import asyncio
import hashlib
import os
import random
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Path
from pydantic import BaseModel

FAILURE_RATE = float(os.getenv("FAILURE_RATE", "0.1"))
LATENCY_MS = int(os.getenv("LATENCY_MS", "150"))
SLOW_DELAY_S = float(os.getenv("SLOW_DELAY_S", "6"))
FLAKY_FAILURES = 2

NOMBRES = ["Ana María", "Carlos Andrés", "Luisa Fernanda", "Jorge Iván", "Paula Andrea",
           "Juan Sebastián", "Diana Marcela", "Andrés Felipe", "Natalia", "Santiago"]
APELLIDOS = ["Gómez", "Rodríguez", "Martínez", "López", "Hernández", "Ramírez",
             "Torres", "Castro", "Vargas", "Moreno", "Rojas", "Ortiz"]
ANTECEDENTES = [
    "Sanción disciplinaria vigente (registro ficticio)",
    "Inhabilidad para contratar con el Estado (registro ficticio)",
    "Suspensión en el ejercicio del cargo (registro ficticio)",
]

app = FastAPI(
    title="Servicio simulado de antecedentes",
    description="Datos ficticios para la prueba técnica de VISE. No consulta fuentes reales.",
    version="1.0.0",
)

# Contador por cédula para simular fallos transitorios (estado en memoria, solo demo)
_attempts: dict[str, int] = defaultdict(int)


class ConsultaResponse(BaseModel):
    cedula: str
    nombres: str
    tiene_antecedentes: bool
    detalle: str
    fuente: str = "Servicio simulado (datos ficticios)"
    consultado_en: datetime


def _seed(cedula: str) -> int:
    """Número estable derivado de la cédula: misma cédula → misma respuesta."""
    return int(hashlib.sha256(cedula.encode()).hexdigest(), 16)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(
    "/api/v1/antecedentes/{cedula}",
    response_model=ConsultaResponse,
    responses={404: {"description": "Cédula no registrada"}, 503: {"description": "Servicio no disponible"}},
)
async def consultar(cedula: str = Path(pattern=r"^\d{6,10}$")) -> ConsultaResponse:
    _attempts[cedula] += 1
    await asyncio.sleep(LATENCY_MS / 1000)

    # --- Fallos inyectados ---
    if cedula.endswith("99"):
        raise HTTPException(status_code=500, detail="Error interno simulado")
    if cedula.endswith("13") and _attempts[cedula] <= FLAKY_FAILURES:
        raise HTTPException(status_code=503, detail="Servicio temporalmente no disponible (simulado)")
    if cedula.endswith("77"):
        await asyncio.sleep(SLOW_DELAY_S)
    if random.random() < FAILURE_RATE:
        raise HTTPException(status_code=503, detail="Servicio temporalmente no disponible (aleatorio)")

    # --- Respuesta determinista ---
    seed = _seed(cedula)
    if seed % 7 == 0:
        raise HTTPException(status_code=404, detail="Cédula no registrada")

    primer = (seed // 7) % len(APELLIDOS)
    segundo = (primer + 1 + (seed // 13) % (len(APELLIDOS) - 1)) % len(APELLIDOS)  # nunca igual al primero
    nombres = f"{NOMBRES[seed % len(NOMBRES)]} {APELLIDOS[primer]} {APELLIDOS[segundo]}"
    tiene = seed % 5 == 0
    return ConsultaResponse(
        cedula=cedula,
        nombres=nombres,
        tiene_antecedentes=tiene,
        detalle=ANTECEDENTES[seed % len(ANTECEDENTES)] if tiene else "Sin antecedentes registrados",
        consultado_en=datetime.now(timezone.utc),
    )
