"""Validador: normaliza cada cédula, valida 6–10 dígitos y elimina duplicados conservando el orden."""

import re
from dataclasses import dataclass, field

from .models import FilaCedula

PATRON_CEDULA = re.compile(r"^\d{6,10}$")


@dataclass(frozen=True, slots=True)
class CedulaValida:
    fila: int
    cedula: str


@dataclass(frozen=True, slots=True)
class CedulaInvalida:
    fila: int
    valor: str
    motivo: str


@dataclass(slots=True)
class ResultadoValidacion:
    """Resultado en orden de aparición; los duplicados se descartan y se cuentan."""

    items: list[CedulaValida | CedulaInvalida] = field(default_factory=list)
    duplicados: int = 0

    @property
    def validas(self) -> list[CedulaValida]:
        return [i for i in self.items if isinstance(i, CedulaValida)]

    @property
    def invalidas(self) -> list[CedulaInvalida]:
        return [i for i in self.items if isinstance(i, CedulaInvalida)]


def normalizar(valor: object) -> str | None:
    """
    Convierte el valor de la celda a texto:
    - Excel guarda números como int o float (12345678.0) → "12345678".
    - Texto → se quitan espacios en los extremos.
    - None → None (celda vacía).
    """
    if valor is None:
        return None
    if isinstance(valor, bool):
        return str(valor)  # VERDADERO/FALSO de Excel: se reportará como no numérico
    if isinstance(valor, float):
        return str(int(valor)) if valor.is_integer() else str(valor)
    return str(valor).strip()


def validar_cedula(valor: object) -> tuple[str | None, str | None]:
    """Devuelve (cedula_normalizada, None) si es válida o (None, motivo) si no lo es."""
    texto = normalizar(valor)
    if not texto:
        return None, "celda vacía"
    if not (texto.isascii() and texto.isdigit()):
        return None, "contiene caracteres no numéricos"
    if not PATRON_CEDULA.fullmatch(texto):
        return None, f"tiene {len(texto)} dígitos (se esperan entre 6 y 10)"
    return texto, None


def validar(filas: list[FilaCedula]) -> ResultadoValidacion:
    resultado = ResultadoValidacion()
    vistas: set[str] = set()  # O(1) por búsqueda → deduplicación O(n)

    for fila in filas:
        cedula, motivo = validar_cedula(fila.valor)
        if cedula is None:
            resultado.items.append(
                CedulaInvalida(fila=fila.fila, valor=normalizar(fila.valor) or "", motivo=motivo or "inválida")
            )
        elif cedula in vistas:
            resultado.duplicados += 1
        else:
            vistas.add(cedula)
            resultado.items.append(CedulaValida(fila=fila.fila, cedula=cedula))

    return resultado
