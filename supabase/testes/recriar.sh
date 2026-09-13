#!/usr/bin/env bash
# Recria o banco de teste do zero, aplica o shim, as migrations e os testes de RLS.
#
# Usa um Postgres comum, não o Supabase local (que precisa de Docker). Variáveis:
#   PGHOST (padrão /tmp), PGPORT (padrão 5433), PGUSER (padrão postgres),
#   PGDATABASE_TESTE (padrão nutri_teste).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PGHOST="${PGHOST:-/tmp}"
export PGPORT="${PGPORT:-5433}"
export PGUSER="${PGUSER:-postgres}"
BANCO="${PGDATABASE_TESTE:-nutri_teste}"

psql -d postgres -q -c "drop database if exists ${BANCO} with (force);"
psql -d postgres -q -c "create database ${BANCO};"

executar() {
  echo "→ $(basename "$1")"
  psql -d "${BANCO}" -v ON_ERROR_STOP=1 -q -f "$1"
}

executar "${RAIZ}/supabase/testes/00_shim_supabase.sql"

for migration in "${RAIZ}"/supabase/migrations/*.sql; do
  executar "${migration}"
done

if [[ "${1:-}" != "--sem-testes" ]]; then
  for teste in "${RAIZ}"/supabase/testes/*_teste.sql; do
    [[ -e "${teste}" ]] || continue
    executar "${teste}"
  done
fi

echo "OK"
