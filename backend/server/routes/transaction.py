import random
import time
from decimal import Decimal

from flask import jsonify, request
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm.exc import NoResultFound

from server.exceptions.db import DBException
from server.models import db
from server.models.account import Account
from server.models.transaction import Transaction
from server.routes.server import custom_route, require_token

MAX_RETRIES = 3
RETRY_DELAY_RANGE = (0.1, 0.5)


@custom_route(
    "/account/<string:account_id>/transaction",
    methods=["GET"],
)
@require_token
def get_transactions(account_id):
    transactions = (
        Transaction.query.join(Account)
        .filter(Account.id == account_id, Account.user_id == request.user.id)
        .all()
    )
    return jsonify(
        isError=False,
        message="Success",
        data=[transaction.as_dict() for transaction in transactions],
    )


@custom_route(
    "/account/<string:account_id>/transaction",
    methods=["POST"],
)
@require_token
def create_transaction(account_id):
    try:
        request_data = request.get_json()
        operation = request_data["operation"]
        value = request_data["value"]

        for attempt in range(MAX_RETRIES):
            try:
                with db.session.begin_nested():
                    account = (
                        db.session.query(Account)
                        .filter_by(id=account_id, user_id=request.user.id)
                        .with_for_update()
                        .one()
                    )
                    account.balance += Decimal(str(value))

                    new_transaction = Transaction(
                        account_id=account.id,
                        operation=operation,
                        value=value,
                    )
                    db.session.add(new_transaction)
                    time.sleep(10)  # holds the row lock for 10 seconds

                db.session.commit()
                break

            except OperationalError as e:
                if "deadlock detected" in str(e).lower() and attempt < MAX_RETRIES - 1:
                    db.session.rollback()
                    time.sleep(random.uniform(*RETRY_DELAY_RANGE))
                    continue
                else:
                    raise

    except KeyError:
        raise Exception("Missing required field")

    except NoResultFound:
        raise DBException("Account not found")

    except Exception as err:
        db.session.rollback()
        raise DBException(f"Transaction failed: {str(err)}")

    return jsonify(message="Transaction completed")
