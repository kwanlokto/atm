"""
Consumer for the post-transaction event stream (Redis Streams).

`consume_loop()` reads from a consumer group so multiple consumers (whether
separate `worker` processes or one embedded thread per API replica) share the
work and each message is delivered once and acked. This replaces the old
RabbitMQ worker.

Two ways it runs:
  * standalone — `worker.py` calls `consume_loop()` directly (compose / VPS).
  * embedded — `start_background_consumer()` spawns it as a daemon thread inside
    the API process, for single-service free hosting (gated by RUN_EMBEDDED_WORKER).
"""

import json
import os
import threading
import time

import redis

from definitions import (
    INSTANCE_ID,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_URL,
    TRANSACTION_EVENTS_GROUP,
    TRANSACTION_EVENTS_STREAM,
)

# Block this long waiting for new entries. A long block keeps idle command
# volume tiny (~1 read / 30s) — important on metered free tiers like Upstash.
_BLOCK_MS = 30_000

_started = False
_start_lock = threading.Lock()


def _consumer_client():
    """
    A dedicated Redis connection for the blocking read. The shared request
    client uses a 2s socket timeout, which would abort a 30s blocking XREADGROUP;
    here we set the socket timeout safely above the block window.
    """
    socket_timeout = (_BLOCK_MS / 1000.0) + 5
    if REDIS_URL:
        return redis.Redis.from_url(
            REDIS_URL, decode_responses=True, socket_timeout=socket_timeout
        )
    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
        socket_timeout=socket_timeout,
    )


def _handle(event):
    print(
        f"[worker {INSTANCE_ID}] processed {event.get('type')} "
        f"event for account={event.get('account_id') or event.get('from_account_id')} "
        f"amount={event.get('amount')}",
        flush=True,
    )


def _ensure_group(client):
    """Create the consumer group (and the stream) if they don't exist yet."""
    try:
        client.xgroup_create(
            TRANSACTION_EVENTS_STREAM,
            TRANSACTION_EVENTS_GROUP,
            id="0",
            mkstream=True,
        )
    except redis.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise  # group already exists is fine; anything else is real


def consume_loop(consumer_name=None):
    """Block forever, processing and acking events. Reconnects on Redis errors."""
    consumer_name = consumer_name or f"{INSTANCE_ID}-{os.getpid()}"
    print(
        f"[worker {INSTANCE_ID}] consuming {TRANSACTION_EVENTS_STREAM} "
        f"as {consumer_name}",
        flush=True,
    )
    while True:
        try:
            client = _consumer_client()
            _ensure_group(client)
            while True:
                resp = client.xreadgroup(
                    TRANSACTION_EVENTS_GROUP,
                    consumer_name,
                    {TRANSACTION_EVENTS_STREAM: ">"},
                    count=10,
                    block=_BLOCK_MS,
                )
                if not resp:
                    continue  # block window elapsed with no new entries
                for _stream, entries in resp:
                    for entry_id, fields in entries:
                        try:
                            _handle(json.loads(fields["data"]))
                        except Exception as e:  # noqa: BLE001
                            print(
                                f"[worker {INSTANCE_ID}] error on {entry_id}: {e}",
                                flush=True,
                            )
                        # Ack even on handler error: this is best-effort fan-out
                        # (notifications/logging), not the ledger. The DB already
                        # committed; we don't want a poison message to wedge the
                        # group.
                        client.xack(
                            TRANSACTION_EVENTS_STREAM,
                            TRANSACTION_EVENTS_GROUP,
                            entry_id,
                        )
        except redis.RedisError as e:
            print(f"[worker {INSTANCE_ID}] reconnecting after {e}", flush=True)
            time.sleep(2)


def start_background_consumer(consumer_name=None):
    """Start consume_loop() in a daemon thread, at most once per process."""
    global _started
    with _start_lock:
        if _started:
            return
        _started = True
    thread = threading.Thread(
        target=consume_loop,
        kwargs={"consumer_name": consumer_name},
        name="event-consumer",
        daemon=True,
    )
    thread.start()
