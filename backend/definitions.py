import os

from dotenv import load_dotenv

# Load environment variables if we are not running in docker
if "RUNNING_IN_DOCKER" not in os.environ:
    env_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")

    if not os.path.isfile(env_file_path):
        raise Exception("App setup error: Missing .env file.")

    load_dotenv(env_file_path)

try:
    JWT_SECRET = os.environ["JWT_SECRET"]
    APP_ENV = os.environ.get("APP_ENV", "development")

    # Full connection string wins when present (Neon/managed Postgres). Otherwise
    # we build one from the discrete POSTGRES_* parts (local compose / VPS).
    DATABASE_URL = os.environ.get("DATABASE_URL")

    POSTGRES_SERVER = os.environ.get("POSTGRES_SERVER", "")
    POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "")
    POSTGRES_DB = os.environ.get("POSTGRES_DB", "")
    POSTGRES_USER = os.environ.get("POSTGRES_USER", "")
    POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "")

    if not DATABASE_URL and not all(
        [POSTGRES_SERVER, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER]
    ):
        raise Exception(
            "App setup error: set DATABASE_URL, or all of POSTGRES_SERVER/"
            "POSTGRES_PORT/POSTGRES_DB/POSTGRES_USER/POSTGRES_PASSWORD."
        )

    # Same idea for Redis: a full rediss:// URL (Upstash) wins, else host/port.
    REDIS_URL = os.environ.get("REDIS_URL")
    REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
    REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))

    # Post-transaction events are fanned out through a Redis Stream (was RabbitMQ).
    TRANSACTION_EVENTS_STREAM = os.environ.get(
        "TRANSACTION_EVENTS_STREAM", "transaction.events"
    )
    TRANSACTION_EVENTS_GROUP = os.environ.get(
        "TRANSACTION_EVENTS_GROUP", "transaction.workers"
    )
    # When true, the API process also runs the event consumer in a background
    # thread (single-service free hosting). compose sets this false and runs a
    # dedicated `worker` service instead.
    RUN_EMBEDDED_WORKER = os.environ.get("RUN_EMBEDDED_WORKER", "true").lower() == "true"

    # Comma-separated allowed CORS origins; "*" (default) allows any.
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

    SESSION_TTL_SECONDS = int(os.environ.get("SESSION_TTL_SECONDS", str(60 * 60)))
    INSTANCE_ID = os.environ.get("HOSTNAME", "local")

except KeyError as err:
    raise Exception(f"Missing ENV variable. {err}")


def get_database_uri():
    """
    SQLAlchemy/psycopg2 connection string. Prefers a full DATABASE_URL (Neon /
    managed Postgres, which includes ?sslmode=require), else builds one from the
    discrete POSTGRES_* parts used by local compose. Normalizes the legacy
    'postgres://' scheme that some providers hand out to the 'postgresql://'
    form SQLAlchemy expects.
    """
    if DATABASE_URL:
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        return url
    return (
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
        f"@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
    )
