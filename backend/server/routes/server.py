import traceback
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt, get_jwt_identity, jwt_required
from flask_migrate import Migrate

from definitions import (
    APP_ENV,
    INSTANCE_ID,
    JWT_SECRET,
    POSTGRES_DB,
    POSTGRES_PASSWORD,
    POSTGRES_PORT,
    POSTGRES_SERVER,
    POSTGRES_USER,
)
from server.exceptions.base import InternalException
from server.exceptions.db import DBException
from server.infra.session_store import session_exists
from server.models import db
from server.models.user import User

webserver = Flask(__name__)
CORS(webserver)

DATABASE_URI = (
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

webserver.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URI
webserver.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_size": 5,
    "max_overflow": 5,
    "pool_pre_ping": True,
    "pool_recycle": 1800,
}

db.init_app(webserver)
Migrate(webserver, db)

webserver.config["JWT_SECRET_KEY"] = JWT_SECRET
webserver.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)

jwt = JWTManager(webserver)


@jwt.expired_token_loader
def expired_token_callback(_header, _payload):
    return (jsonify(message="Token has expired"), 401)


@jwt.invalid_token_loader
def invalid_token_callback(reason):
    return (jsonify(message=f"Invalid token: {reason}"), 401)


@jwt.unauthorized_loader
def missing_token_callback(reason):
    return (jsonify(message=f"Missing token: {reason}"), 401)


def custom_route(rule, **options):
    """Route decorator that translates exceptions into JSON responses."""

    def decorator(function_reference):
        @webserver.route(rule, **options)
        @wraps(function_reference)
        def wrapper(*args, **kwargs):
            try:
                resp_body = function_reference(*args, **kwargs)
                status_code = 200
            except InternalException as err:
                status_code = err.status_code
                resp_body = jsonify(message=f"{err.message} (error code: {status_code})")
            except DBException as err:
                status_code = err.status_code
                resp_body = jsonify(message=f"DB Error: {err.message} (error code: {status_code})")
            except Exception as err:
                resp_body = jsonify(message="Internal server error.")
                status_code = 500
                print(
                    f"Time: {datetime.now().strftime('%H:%M:%S')}\n"
                    f"Instance: {INSTANCE_ID}\n"
                    f"Function: {str(function_reference.__name__)}\n"
                    f"{type(err).__name__}: {str(err)}\n"
                    f"Message: {traceback.format_exc()}\n",
                    flush=True,
                )

            if isinstance(resp_body, tuple):
                return resp_body
            return (resp_body, status_code)

        return wrapper

    return decorator


def require_token(f):
    @jwt_required()
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        claims = get_jwt()
        jti = claims.get("jti")

        if not session_exists(user_id, jti):
            return (jsonify(message="Session no longer valid"), 401)

        user = User.query.filter_by(id=user_id).one_or_none()
        if not user:
            return (jsonify(message="User not found"), 401)

        request.user = user
        return f(*args, **kwargs)

    return decorated_function


@webserver.after_request
def add_instance_header(response):
    # Helps verify load balancing in dev — shows which replica handled the request.
    response.headers["X-Served-By"] = INSTANCE_ID
    return response


@webserver.route("/health", methods=["GET"])
def health():
    return jsonify(status="ok", instance=INSTANCE_ID, env=APP_ENV)
