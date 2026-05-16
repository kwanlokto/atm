#!/bin/sh
set -e

ROLE="${SERVICE_ROLE:-api}"

if [ "$ROLE" = "api" ]; then
    # Only one replica needs to run migrations; others wait for the schema to settle.
    if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
        echo "[entrypoint] running alembic upgrade head"
        flask db upgrade || alembic upgrade head
    else
        echo "[entrypoint] skipping migrations (RUN_MIGRATIONS!=true)"
    fi
    exec gunicorn app:webserver \
        -b 0.0.0.0:5000 \
        -w "${GUNICORN_WORKERS:-4}" \
        --threads "${GUNICORN_THREADS:-4}" \
        --worker-class gthread \
        --access-logfile - \
        --error-logfile -
elif [ "$ROLE" = "worker" ]; then
    exec python worker.py
else
    echo "Unknown SERVICE_ROLE=$ROLE"
    exit 1
fi
