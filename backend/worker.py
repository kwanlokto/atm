"""
Standalone async worker that consumes post-transaction events from a Redis
Stream consumer group.

In a real bank this is where you'd send push notifications, write to an audit
warehouse, run fraud rules, generate statements, etc. Here it just logs each
event and acks. Run multiple instances by scaling the `worker` service in
docker-compose; the Redis consumer group load-balances across them.

For single-service free hosting the same loop runs embedded in the API process
(see server.infra.consumer.start_background_consumer); this script is the
standalone path for compose / VPS.
"""

from server.infra.consumer import consume_loop

if __name__ == "__main__":
    consume_loop()
