"""
Redis-backed session store.

Each successful login writes the JWT to `session:{user_id}:{jti}` with a TTL.
Logout / token rotation removes the entry. Auth middleware checks the key
exists before honoring the token, so revocation is instant across all
backend replicas.
"""

import redis

from definitions import (
    REDIS_HOST,
    REDIS_PORT,
    REDIS_URL,
    SESSION_TTL_SECONDS,
)

_client = None


def redis_client():
    global _client
    if _client is None:
        if REDIS_URL:
            # Managed Redis (e.g. Upstash) hands you a full rediss:// URL with
            # auth baked in. from_url handles TLS + credentials for us.
            _client = redis.Redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_timeout=2,
                socket_connect_timeout=2,
            )
        else:
            _client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True,
                socket_timeout=2,
                socket_connect_timeout=2,
            )
    return _client


def _key(user_id, jti):
    return f"session:{user_id}:{jti}"


def store_session(user_id, jti, ttl=SESSION_TTL_SECONDS):
    redis_client().set(_key(user_id, jti), "1", ex=ttl)


def session_exists(user_id, jti):
    try:
        return redis_client().get(_key(user_id, jti)) is not None
    except redis.RedisError:
        return False


def revoke_session(user_id, jti):
    try:
        redis_client().delete(_key(user_id, jti))
    except redis.RedisError:
        pass
