import os

from dotenv import load_dotenv

# Load environment variables from if we are not running in docker
if "RUNNING_IN_DOCKER" not in os.environ:
    # Check if .env files are present
    env_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")

    if not os.path.isfile(env_file_path):
        raise Exception("App setup error: Missing .env file.")

    # Load missing env variables from development .env files
    load_dotenv()

try:
    JWT_SECRET = os.environ["JWT_SECRET"]
    APP_ENV = "development"

    POSTGRES_SERVER = os.environ["POSTGRES_SERVER"]
    POSTGRES_PORT = os.environ["POSTGRES_PORT"]
    POSTGRES_DB = os.environ["POSTGRES_DB"]
    POSTGRES_USER = os.environ["POSTGRES_USER"]
    POSTGRES_PASSWORD = os.environ["POSTGRES_PASSWORD"]

except KeyError as err:
    raise Exception(f"Missing ENV variable. {err}")
