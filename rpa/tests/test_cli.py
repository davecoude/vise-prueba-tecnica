import re

import responses

from rpa_antecedentes.cli import EXIT_ENTRADA_INVALIDA, EXIT_OK, main

URL = re.compile(r"http://svc\.test/api/v1/antecedentes/\d+")


@responses.activate
def test_ejecucion_completa_genera_reporte_log_y_resumen(crear_excel, tmp_path, monkeypatch, capsys) -> None:
    monkeypatch.setenv("RPA_BACKOFF_BASE_S", "0")
    responses.get(URL, json={"nombres": "Ana Gómez", "tiene_antecedentes": False, "detalle": "Sin antecedentes"})
    entrada = crear_excel([["1032456781"], ["79845612"]])
    salida = tmp_path / "reporte_antecedentes.xlsx"
    logs = tmp_path / "logs"

    codigo = main(["-i", str(entrada), "-o", str(salida), "--log-dir", str(logs), "--service-url", "http://svc.test"])

    assert codigo == EXIT_OK
    assert salida.exists()
    assert "Limpios                    :      2" in capsys.readouterr().out
    archivo_log = next(logs.glob("rpa_*.log"))
    contenido = archivo_log.read_text(encoding="utf-8")
    assert re.search(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \| INFO", contenido, re.MULTILINE)


def test_archivo_de_entrada_inexistente_sale_con_codigo_2(tmp_path) -> None:
    codigo = main(["-i", str(tmp_path / "no.xlsx"), "--log-dir", str(tmp_path / "logs")])

    assert codigo == EXIT_ENTRADA_INVALIDA
