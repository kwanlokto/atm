"""
Asynchronous fan-out of post-transaction events to RabbitMQ.

The HTTP handler is the source of truth (DB commit posts the money). After
commit succeeds, we publish a small event so downstream consumers
(notifications, statements, fraud scoring) can react without blocking the
client response.

Publishing failures are logged but never block the API response — the
ledger row is already durable in Postgres.
"""

import json
import threading

import pika

from definitions import (
    RABBITMQ_HOST,
    RABBITMQ_PASSWORD,
    RABBITMQ_PORT,
    RABBITMQ_USER,
    TRANSACTION_EVENTS_QUEUE,
)

_lock = threading.Lock()
_connection = None
_channel = None


def _connect():
    global _connection, _channel
    params = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD),
        heartbeat=30,
        blocked_connection_timeout=10,
    )
    _connection = pika.BlockingConnection(params)
    _channel = _connection.channel()
    _channel.queue_declare(queue=TRANSACTION_EVENTS_QUEUE, durable=True)


def publish_transaction_event(event):
    """
    Best-effort fan-out. Drops the message rather than failing the request if
    RabbitMQ is unreachable.
    """
    body = json.dumps(event, default=str).encode("utf-8")
    with _lock:
        for attempt in range(2):
            try:
                if _channel is None or _channel.is_closed:
                    _connect()
                _channel.basic_publish(
                    exchange="",
                    routing_key=TRANSACTION_EVENTS_QUEUE,
                    body=body,
                    properties=pika.BasicProperties(
                        delivery_mode=2,  # persistent
                        content_type="application/json",
                    ),
                )
                return
            except (pika.exceptions.AMQPError, OSError) as e:
                print(f"[events] publish failed (attempt {attempt}): {e}", flush=True)
                try:
                    if _connection and not _connection.is_closed:
                        _connection.close()
                except Exception:
                    pass
                globals()["_connection"] = None
                globals()["_channel"] = None
        print(f"[events] dropped event: {event}", flush=True)
