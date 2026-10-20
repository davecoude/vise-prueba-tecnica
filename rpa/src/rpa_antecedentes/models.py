"""Modelos de dominio compartidos por todos los módulos."""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class Estado(StrEnum):
    """Estados exigidos para la columna `estado` del reporte."""

    LIMPIO = "limpio"
    CON_ANTECEDENTES = "con antecedentes"
    NO_ENCONTRADO = "no encontrado"
    ERROR = "error"


@dataclass(frozen=True, slots=True)
class FilaCedula:
    """Valor crudo leído del Excel, con su número de fila para trazabilidad."""

    fila: int
    valor: object


@dataclass(frozen=True, slots=True)
class ResultadoConsulta:
    """Una fila del reporte final."""

    cedula: str
    nombres: str
    estado: Estado
    detalle: str
    fecha_consulta: datetime


@dataclass(frozen=True, slots=True)
class Resumen:
    total: int
    limpios: int
    con_antecedentes: int
    no_encontrados: int
    errores: int
    duplicados_eliminados: int
    invalidas: int

    @classmethod
    def desde(cls, resultados: list[ResultadoConsulta], duplicados: int, invalidas: int) -> "Resumen":
        def contar(estado: Estado) -> int:
            return sum(1 for r in resultados if r.estado is estado)

        return cls(
            total=len(resultados),
            limpios=contar(Estado.LIMPIO),
            con_antecedentes=contar(Estado.CON_ANTECEDENTES),
            no_encontrados=contar(Estado.NO_ENCONTRADO),
            errores=contar(Estado.ERROR),
            duplicados_eliminados=duplicados,
            invalidas=invalidas,
        )
