import secrets

from flask import jsonify, request
from flask_jwt_extended import create_access_token, decode_token, get_jwt, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from server.exceptions.db import DBException
from server.infra.session_store import revoke_session, store_session
from server.models import db
from server.models.account import Account
from server.models.user import User
from server.routes.server import custom_route, require_token


def _generate_account_number():
    return "".join(secrets.choice("0123456789") for _ in range(12))


def _create_default_account(user_id):
    """Give every new user a starter checking account so the dashboard isn't empty."""
    for _ in range(5):
        try:
            with db.session.begin_nested():
                acct = Account(
                    name="Primary Checking",
                    account_number=_generate_account_number(),
                    account_type="checking",
                    user_id=user_id,
                )
                db.session.add(acct)
            return acct
        except IntegrityError:
            db.session.rollback()
    raise DBException("Could not allocate account number")


def _issue_session(user):
    token = create_access_token(identity=str(user.id))
    decoded = decode_token(token)
    store_session(str(user.id), decoded["jti"])
    return token


@custom_route("/user/signup", methods=["POST"])
def user_signup():
    try:
        request_data = request.get_json()
        first_name = request_data["first_name"]
        last_name = request_data["last_name"]
        email = request_data["email"]
        password = request_data["password"]
    except KeyError as err:
        raise DBException(f"Missing required field: {err}", status_code=400)

    try:
        new_user = User(first_name=first_name, last_name=last_name, email=email.lower())
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.flush()
        _create_default_account(new_user.id)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise DBException("An account with that email already exists", status_code=409)
    except Exception as err:
        db.session.rollback()
        raise DBException(str(err))

    token = _issue_session(new_user)

    return jsonify(
        message="Added new user to db",
        data={"user": new_user.as_dict(), "token": token},
    )


@custom_route("/user/login", methods=["POST"])
def user_login():
    try:
        request_data = request.get_json()
        email = request_data["email"].lower()
        password = request_data["password"]
    except KeyError as err:
        raise DBException(f"Missing required field: {err}", status_code=400)

    user = User.query.filter_by(email=email).one_or_none()
    if not user or not user.check_password(password):
        raise DBException("Invalid email or password", status_code=401)

    token = _issue_session(user)

    return jsonify(
        message="Login successful",
        data={"user": user.as_dict(), "token": token},
    )


@custom_route("/user/logout", methods=["POST"])
@require_token
def user_logout():
    claims = get_jwt()
    revoke_session(get_jwt_identity(), claims.get("jti"))
    return jsonify(message="Logged out")


@custom_route("/user/me", methods=["GET"])
@require_token
def user_me():
    return jsonify(data=request.user.as_dict())
