# syntax=docker/dockerfile:1

# ---------- 1. Base: dependencias de ejecución ----------
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
RUN pip install .

# ---------- 2. Pruebas como quality gate: si fallan, la imagen no se construye ----------
FROM base AS test
RUN pip install ".[dev]"
COPY tests ./tests
RUN python -m pytest && touch /tmp/tests-ok

# ---------- 3. Runtime ----------
FROM base AS runtime
# Dependencia explícita de la etapa de pruebas (BuildKit omite etapas no referenciadas)
COPY --from=test /tmp/tests-ok /tmp/tests-ok
COPY data ./data
# UID 1000: coincide con el usuario habitual del host → puede escribir en los volúmenes montados
RUN useradd --uid 1000 --create-home rpa && mkdir -p output logs && chown rpa:rpa output logs
USER rpa
ENTRYPOINT ["rpa-antecedentes"]
CMD ["--input", "data/cedulas.xlsx", "--output", "output/reporte_antecedentes.xlsx", "--log-dir", "logs"]
