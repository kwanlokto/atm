"""
Gunicorn config. Its one job beyond defaults: when RUN_EMBEDDED_WORKER is true,
start the Redis-Stream event consumer in a background thread inside each worker
process. This lets a single web service double as the async worker, so the whole
app fits one free-tier service (no separate always-on worker to pay for).

compose sets RUN_EMBEDDED_WORKER=false and runs a dedicated `worker` service
instead, preserving the distributed layout locally.
"""

import os


def post_fork(server, worker):
    if os.environ.get("RUN_EMBEDDED_WORKER", "true").lower() != "true":
        return
    # Import lazily so a misconfigured Redis can't stop the web server booting.
    from server.infra.consumer import start_background_consumer

    hostname = os.environ.get("HOSTNAME", "api")
    start_background_consumer(consumer_name=f"{hostname}-{worker.pid}")
    server.log.info("post_fork: embedded event consumer started (pid=%s)", worker.pid)
