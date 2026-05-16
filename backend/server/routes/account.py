import secrets

from flask import jsonify, request
from sqlalchemy.exc import IntegrityError

from server.exceptions.db import DBException
from server.models import db
from server.models.account import Account
from server.routes.server import custom_route, require_token

VALID_TYPES = ("checking", "savings")


def _generate_account_number():
    return "".join(secrets.choice("0123456789") for _ in range(12))


@custom_route("/account", methods=["GET"])
@require_token
def get_account():
    accounts = Account.query.filter_by(user_id=request.user.id).order_by(Account.id).all()
    return jsonify(
        isError=False,
        message="Success",
        data=[a.as_dict() for a in accounts],
    )


@custom_route("/account/<int:account_id>", methods=["GET"])
@require_token
def get_single_account(account_id):
    account = Account.query.filter_by(id=account_id, user_id=request.user.id).one_or_none()
    if not account:
        raise DBException("Account not found", status_code=404)
    return jsonify(isError=False, data=account.as_dict())


@custom_route("/account", methods=["POST"])
@require_token
def create_account():
    body = request.get_json() or {}
    name = (body.get("name") or "").strip()
    account_type = (body.get("account_type") or "checking").lower()

    if not name:
        raise DBException("Account name is required", status_code=400)
    if account_type not in VALID_TYPES:
        raise DBException(
            f"account_type must be one of {VALID_TYPES}", status_code=400
        )

    for _ in range(5):
        try:
            new_account = Account(
                name=name,
                account_number=_generate_account_number(),
                account_type=account_type,
                user_id=request.user.id,
            )
            db.session.add(new_account)
            db.session.commit()
            return jsonify(
                isError=False,
                data=new_account.as_dict(),
                message="Added new account to db",
            )
        except IntegrityError as e:
            db.session.rollback()
            # Either duplicate account number (retry) or duplicate (name,user_id) (give up)
            if "_user_account_name_uc" in str(e.orig):
                raise DBException(
                    "You already have an account with that name", status_code=409
                )
    raise DBException("Could not allocate account number")


@custom_route("/account/<int:account_id>", methods=["DELETE"])
@require_token
def delete_account(account_id):
    account = Account.query.filter_by(id=account_id, user_id=request.user.id).first()
    if not account:
        raise DBException("Account not found or not authorized", status_code=404)
    if account.balance != 0:
        raise DBException(
            "Account balance must be zero before deletion", status_code=409
        )

    db.session.delete(account)
    db.session.commit()
    return jsonify(isError=False, message="Account deleted successfully")
