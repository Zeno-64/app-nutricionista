#!/usr/bin/env bash
# Sobe um Postgres local para rodar as migrations e os testes sem Docker.
#
# O Supabase local precisa de Docker, que nem sempre existe (é o caso do
# ambiente de nuvem). Este script cria um cluster próprio na porta 5433, que é
# tudo de que `recriar.sh` precisa.
#
#   ./supabase/testes/subir-postgres.sh
#   npm run db:teste
#
# O cluster não sobrevive ao fim do contêiner: rodar de novo recria do zero.
set -euo pipefail

VERSAO="${PG_VERSAO:-16}"
PGDATA="${PGDATA:-/var/lib/postgresql/${VERSAO}/nutri}"
PORTA="${PGPORT:-5433}"
BIN="/usr/lib/postgresql/${VERSAO}/bin"

if [[ ! -x "${BIN}/pg_ctl" ]]; then
  echo "PostgreSQL ${VERSAO} não encontrado em ${BIN}." >&2
  echo "Instale com: apt-get install -y --no-install-recommends postgresql" >&2
  exit 1
fi

# O Postgres recusa rodar como root, então o cluster fica no diretório do
# usuário postgres, que já existe no pacote.
if [[ ! -f "${PGDATA}/PG_VERSION" ]]; then
  mkdir -p "${PGDATA}"
  chown postgres:postgres "${PGDATA}"
  chmod 700 "${PGDATA}"
  su postgres -c "${BIN}/initdb -D ${PGDATA} -U postgres --auth=trust -E UTF8 --locale=C" >/dev/null
  echo "Cluster criado em ${PGDATA}."
fi

if su postgres -c "${BIN}/pg_ctl -D ${PGDATA} status" >/dev/null 2>&1; then
  echo "Postgres já está no ar na porta ${PORTA}."
  exit 0
fi

su postgres -c "${BIN}/pg_ctl -D ${PGDATA} -l ${PGDATA}/servidor.log -o '-p ${PORTA} -k /tmp' -w start" >/dev/null
echo "Postgres no ar na porta ${PORTA}. Agora: npm run db:teste"
