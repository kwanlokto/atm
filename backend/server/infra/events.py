"""
Asynchronous fan-out of post-transaction events through a Redis Stream.

The HTTP handler is the source of truth (DB commit posts the money). After
commit succeeds, we publish a small event so downstream consumers
(notifications, statements, fraud scoring) can react without blocking the
client response.

A Redis Stream + consumer group gives us durable messages, acks, and
load-balanced delivery across multiple workers — the same guarantees the old
RabbitMQ pipeline provided, but on the Redis we already run (so it fits a free
managed tier). Publishing failures are logged but never block the API response;
the ledger row is already durable in Postgres.
"""

import json

from definitions import TRANSACTION_EVENTS_STREAM
from server.infra.session_store import redis_client

# Cap the stream so a busy day can't grow Redis without bound (matters on small
# managed tiers). Approximate trimming is cheaper and plenty accurate here.
_MAXLEN = 1000


def publish_transaction_event(event):
    """
    Best-effort fan-out. Drops the message rather than failing the request if
    Redis is unreachable.
    """
    body = json.dumps(event, default=str)
    try:
        redis_client().xadd(
            TRANSACTION_EVENTS_STREAM,
            {"data": body},
            maxlen=_MAXLEN,
            approximate=True,
        )
    except Exception as e:  # noqa: BLE001 — never let fan-out break a committed txn
        print(f"[events] dropped event ({e}): {event}", flush=True)
