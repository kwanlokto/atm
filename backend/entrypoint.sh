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
    # -c gunicorn.conf.py wires the optional embedded event consumer (post_fork).
    # Default to 1 worker — small free-tier instances have little RAM, and one
    # worker means one embedded consumer.
    exec gunicorn app:webserver \
        -c gunicorn.conf.py \
        -b "0.0.0.0:${PORT:-5000}" \
        -w "${GUNICORN_WORKERS:-1}" \
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
