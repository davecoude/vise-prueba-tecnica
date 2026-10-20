from pathlib import Path

import pytest

from rpa_antecedentes.reader import ArchivoEntradaError, leer_cedulas


def test_lee_la_columna_cedula_sin_importar_mayusculas_tildes_ni_posicion(crear_excel) -> None:
    ruta = crear_excel([["Ana", "1032456781"], ["Luis", 79845612]], encabezados=["nombre", " Cédula "])

    filas = leer_cedulas(ruta)

    assert [(f.fila, f.valor) for f in filas] == [(2, "1032456781"), (3, 79845612)]


def test_omite_filas_totalmente_vacias_y_conserva_el_numero_de_fila(crear_excel) -> None:
    ruta = crear_excel([["1032456781"], [None], ["79845612"]])

    filas = leer_cedulas(ruta)

    assert [f.fila for f in filas] == [2, 4]


def test_sin_columna_cedula_lanza_error_claro(crear_excel) -> None:
    ruta = crear_excel([["1032456781"]], encabezados=["documento"])

    with pytest.raises(ArchivoEntradaError, match="no tiene la columna 'cedula'"):
        leer_cedulas(ruta)


def test_archivo_inexistente(tmp_path: Path) -> None:
    with pytest.raises(ArchivoEntradaError, match="No existe"):
        leer_cedulas(tmp_path / "no-existe.xlsx")


def test_archivo_que_no_es_excel(tmp_path: Path) -> None:
    falso = tmp_path / "cedulas.xlsx"
    falso.write_text("esto no es un Excel", encoding="utf-8")

    with pytest.raises(ArchivoEntradaError, match="No se pudo abrir"):
        leer_cedulas(falso)


def test_archivo_solo_con_encabezado_devuelve_lista_vacia(crear_excel) -> None:
    assert leer_cedulas(crear_excel([])) == []
