#!/usr/bin/env bash
# Applies pending SQL files from ../migrations in filename order, each in its own transaction.
# Applied versions are recorded in schema_migrations, so re-running is safe.
#
#   scripts/migrate.sh           apply pending migrations
#   scripts/migrate.sh status    list applied / pending migrations
#
# Reads DATABASE_URL from the environment or server/.env. Requires the psql client.
set -euo pipefail

SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$SERVER_DIR/migrations"
COMMAND="${1:-up}"

if [[ -z "${DATABASE_URL:-}" && -f "$SERVER_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(tr -d '\r' < "$SERVER_DIR/.env")
  set +a
fi
: "${DATABASE_URL:?DATABASE_URL must be set (see .env.example)}"

command -v psql >/dev/null || { echo "psql not found - install the PostgreSQL client" >&2; exit 1; }

run_sql() {
  PGOPTIONS="-c client_min_messages=warning" \
    psql "$DATABASE_URL" --no-psqlrc --quiet --tuples-only --no-align -v ON_ERROR_STOP=1 "$@"
}

run_sql -c "CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)"

applied="$(run_sql -c "SELECT version FROM schema_migrations")"
is_applied() { grep -qxF "$1" <<<"$applied"; }

shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)

case "$COMMAND" in
  status)
    for f in "${files[@]}"; do
      v="$(basename "$f" .sql)"
      if is_applied "$v"; then echo "applied  $v"; else echo "pending  $v"; fi
    done
    ;;
  up)
    count=0
    for f in "${files[@]}"; do
      v="$(basename "$f" .sql)"
      is_applied "$v" && continue
      echo "applying $v"
      # --single-transaction wraps the file and the bookkeeping insert together: all or nothing
      run_sql --single-transaction -f "$f" -c "INSERT INTO schema_migrations (version) VALUES ('$v')"
      count=$((count + 1))
    done
    echo "done: $count migration(s) applied"
    ;;
  *)
    echo "usage: $0 [up|status]" >&2
    exit 2
    ;;
esac
