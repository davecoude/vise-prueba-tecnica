import pytest

from rpa_antecedentes.models import FilaCedula
from rpa_antecedentes.validator import CedulaInvalida, CedulaValida, normalizar, validar, validar_cedula


class TestValidarCedula:
    @pytest.mark.parametrize("valor", ["123456", "1234567890", "79845612"])
    def test_acepta_entre_6_y_10_digitos(self, valor: str) -> None:
        assert validar_cedula(valor) == (valor, None)

    @pytest.mark.parametrize(
        ("valor", "motivo"),
        [
            ("12345", "tiene 5 dígitos"),
            ("12345678901", "tiene 11 dígitos"),
            ("1.234.567", "no numéricos"),
            ("CC10203040", "no numéricos"),
            ("-123456", "no numéricos"),
            ("12 345 678", "no numéricos"),
            ("١٢٣٤٥٦٧", "no numéricos"),  # dígitos arábigos: isdigit() sería True sin el chequeo ASCII
            ("", "celda vacía"),
            ("   ", "celda vacía"),
            (None, "celda vacía"),
            (True, "no numéricos"),
            (123456.5, "no numéricos"),
        ],
    )
    def test_rechaza_valores_invalidos_con_motivo(self, valor: object, motivo: str) -> None:
        cedula, error = validar_cedula(valor)
        assert cedula is None
        assert error is not None and motivo in error

    def test_normaliza_numeros_de_excel(self) -> None:
        assert normalizar(79845612) == "79845612"
        assert normalizar(79845612.0) == "79845612"  # Excel guarda números como float
        assert normalizar("  71234567 ") == "71234567"


class TestValidarLote:
    def test_elimina_duplicados_conservando_la_primera_aparicion_y_el_orden(self) -> None:
        filas = [
            FilaCedula(2, "1032456781"),
            FilaCedula(3, "79845612"),
            FilaCedula(4, "1032456781"),
            FilaCedula(5, 79845612),  # mismo número, distinto tipo de celda
            FilaCedula(6, "52987431"),
        ]

        resultado = validar(filas)

        assert [v.cedula for v in resultado.validas] == ["1032456781", "79845612", "52987431"]
        assert resultado.duplicados == 2

    def test_las_invalidas_no_cuentan_como_duplicados_y_conservan_su_fila(self) -> None:
        resultado = validar([FilaCedula(2, "123"), FilaCedula(3, "123"), FilaCedula(4, "1234567")])

        assert resultado.duplicados == 0
        assert [i.fila for i in resultado.invalidas] == [2, 3]
        assert resultado.items[2] == CedulaValida(fila=4, cedula="1234567")

    def test_mezcla_validas_e_invalidas_en_el_orden_original(self) -> None:
        resultado = validar([FilaCedula(2, "abc"), FilaCedula(3, "1234567")])

        assert isinstance(resultado.items[0], CedulaInvalida)
        assert isinstance(resultado.items[1], CedulaValida)
