"""
Async worker that consumes post-transaction events from RabbitMQ.

In a real bank this is where you'd send push notifications, write to an
audit warehouse, run fraud rules, generate statements, etc. Here it just
logs each event and acks. Run multiple instances by scaling the
`worker` service in docker-compose; RabbitMQ load-balances across them.
"""

import json
import time

import pika

from definitions import (
    INSTANCE_ID,
    RABBITMQ_HOST,
    RABBITMQ_PASSWORD,
    RABBITMQ_PORT,
    RABBITMQ_USER,
    TRANSACTION_EVENTS_QUEUE,
)


def _handle(event):
    print(
        f"[worker {INSTANCE_ID}] processed {event.get('type')} "
        f"event for account={event.get('account_id') or event.get('from_account_id')} "
        f"amount={event.get('amount')}",
        flush=True,
    )


def _consume():
    params = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD),
        heartbeat=30,
    )
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.queue_declare(queue=TRANSACTION_EVENTS_QUEUE, durable=True)
    channel.basic_qos(prefetch_count=10)

    def on_message(ch, method, _properties, body):
        try:
            event = json.loads(body)
            _handle(event)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            print(f"[worker {INSTANCE_ID}] error: {e}", flush=True)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_consume(
        queue=TRANSACTION_EVENTS_QUEUE, on_message_callback=on_message
    )
    print(f"[worker {INSTANCE_ID}] consuming {TRANSACTION_EVENTS_QUEUE}", flush=True)
    channel.start_consuming()


if __name__ == "__main__":
    while True:
        try:
            _consume()
        except pika.exceptions.AMQPConnectionError as e:
            print(f"[worker {INSTANCE_ID}] reconnecting after {e}", flush=True)
            time.sleep(2)
