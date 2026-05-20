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

    POSTGRES_SERVER = os.environ["POSTGRES_SERVER"]
    POSTGRES_PORT = os.environ["POSTGRES_PORT"]
    POSTGRES_DB = os.environ["POSTGRES_DB"]
    POSTGRES_USER = os.environ["POSTGRES_USER"]
    POSTGRES_PASSWORD = os.environ["POSTGRES_PASSWORD"]

    REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
    REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))

    RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")
    RABBITMQ_PORT = int(os.environ.get("RABBITMQ_PORT", "5672"))
    RABBITMQ_USER = os.environ.get("RABBITMQ_USER", "guest")
    RABBITMQ_PASSWORD = os.environ.get("RABBITMQ_PASSWORD", "guest")
    TRANSACTION_EVENTS_QUEUE = os.environ.get(
        "TRANSACTION_EVENTS_QUEUE", "transaction.events"
    )

    SESSION_TTL_SECONDS = int(os.environ.get("SESSION_TTL_SECONDS", str(60 * 60)))
    INSTANCE_ID = os.environ.get("HOSTNAME", "local")

except KeyError as err:
    raise Exception(f"Missing ENV variable. {err}")
