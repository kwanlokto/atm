"""
Redis-backed distributed lock used as a fast-path mutex BEFORE we touch the DB.

Postgres `SELECT ... FOR UPDATE` is the real source of correctness — these
locks just shed load and reduce lock-wait pile-ups across the backend
replicas when many concurrent requests target the same account. The lock
TTL guarantees that a crashed worker can't permanently wedge an account.
"""

import time
import uuid
from contextlib import contextmanager

from server.infra.session_store import redis_client

_RELEASE_LUA = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


@contextmanager
def account_lock(account_ids, ttl_ms=5000, wait_ms=2000):
    """
    Acquire one or more named locks in a deterministic (sorted) order to
    prevent deadlocks between transfers in opposite directions.
    """
    sorted_ids = sorted(set(account_ids))
    keys = [f"acctlock:{aid}" for aid in sorted_ids]
    token = str(uuid.uuid4())
    client = redis_client()

    deadline = time.time() + (wait_ms / 1000.0)
    held = []
    try:
        for key in keys:
            while True:
                ok = client.set(key, token, nx=True, px=ttl_ms)
                if ok:
                    held.append(key)
                    break
                if time.time() >= deadline:
                    raise TimeoutError(f"Could not acquire lock for {key}")
                time.sleep(0.02)
        yield
    finally:
        for key in held:
            try:
                client.eval(_RELEASE_LUA, 1, key, token)
            except Exception:
                pass
