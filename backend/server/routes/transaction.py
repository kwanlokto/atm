"""
Money-movement endpoints.

Concurrency model:
- A Redis distributed lock is acquired first (per account) to shed thundering-herd
  load and serialize requests across all backend replicas before they hit the DB.
- Inside that lock we open a Postgres transaction and grab the affected rows
  with `SELECT ... FOR UPDATE` (in deterministic ID order for transfers, so
  pairs in opposite directions can never deadlock).
- The Postgres `CHECK (balance >= 0)` constraint is the final backstop —
  even if every other layer is wrong, the DB refuses to overdraw.
- Every write accepts an `Idempotency-Key` header; replays return the original
  result without double-posting.
"""

import uuid
from decimal import Decimal, InvalidOperation

from flask import jsonify, request
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm.exc import StaleDataError

from server.exceptions.db import DBException
from server.infra.events import publish_transaction_event
from server.infra.locks import account_lock
from server.models import db
from server.models.account import Account
from server.models.transaction import Transaction
from server.routes.server import custom_route, require_token

MAX_RETRIES = 3
MAX_AMOUNT = Decimal("1000000.00")


def _parse_amount(raw):
    try:
        amount = Decimal(str(raw)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError):
        raise DBException("Invalid amount", status_code=400)
    if amount <= 0:
        raise DBException("Amount must be positive", status_code=400)
    if amount > MAX_AMOUNT:
        raise DBException("Amount exceeds per-transaction limit", status_code=400)
    return amount


def _idempotency_key():
    return request.headers.get("Idempotency-Key")


def _existing_for_idem(account_id, idem_key):
    if not idem_key:
        return None
    return Transaction.query.filter_by(
        account_id=account_id, idempotency_key=idem_key
    ).one_or_none()


@custom_route("/account/<int:account_id>/transaction", methods=["GET"])
@require_token
def get_transactions(account_id):
    account = Account.query.filter_by(
        id=account_id, user_id=request.user.id
    ).one_or_none()
    if not account:
        raise DBException("Account not found", status_code=404)

    limit = min(int(request.args.get("limit", 50)), 200)
    kind = request.args.get("kind")

    q = Transaction.query.filter_by(account_id=account_id)
    if kind:
        q = q.filter_by(kind=kind)
    txns = q.order_by(Transaction.created_at.desc()).limit(limit).all()

    return jsonify(
        isError=False,
        message="Success",
        data=[t.as_dict() for t in txns],
    )


def _post_single_sided(account_id, kind, amount_signed, description, idem_key):
    """
    Apply a deposit or withdrawal under a row lock + check constraint.
    Returns the new Transaction row.
    """
    account = (
        db.session.query(Account)
        .filter_by(id=account_id, user_id=request.user.id)
        .with_for_update()
        .one_or_none()
    )
    if not account:
        raise DBException("Account not found", status_code=404)

    new_balance = account.balance + amount_signed
    if new_balance < 0:
        raise DBException("Insufficient funds", status_code=409)

    account.balance = new_balance

    txn = Transaction(
        account_id=account.id,
        kind=kind,
        amount=amount_signed,
        balance_after=new_balance,
        description=description,
        idempotency_key=idem_key,
    )
    db.session.add(txn)
    return txn


@custom_route("/account/<int:account_id>/deposit", methods=["POST"])
@require_token
def deposit(account_id):
    body = request.get_json() or {}
    amount = _parse_amount(body.get("amount"))
    description = body.get("description")
    idem_key = _idempotency_key()

    existing = _existing_for_idem(account_id, idem_key)
    if existing:
        return jsonify(message="Replay", data=existing.as_dict())

    for attempt in range(MAX_RETRIES):
        try:
            with account_lock([account_id]):
                txn = _post_single_sided(
                    account_id, "deposit", amount, description, idem_key
                )
                db.session.commit()
            publish_transaction_event(
                {
                    "type": "deposit",
                    "account_id": account_id,
                    "amount": str(amount),
                    "transaction_id": txn.id,
                }
            )
            return jsonify(message="Deposit complete", data=txn.as_dict())
        except OperationalError as e:
            db.session.rollback()
            if "deadlock" in str(e).lower() and attempt < MAX_RETRIES - 1:
                continue
            raise DBException("Database busy, please retry")
        except IntegrityError as e:
            db.session.rollback()
            if idem_key and "_account_idem_uc" in str(e.orig):
                existing = _existing_for_idem(account_id, idem_key)
                if existing:
                    return jsonify(message="Replay", data=existing.as_dict())
            raise DBException("Constraint violation")


@custom_route("/account/<int:account_id>/withdraw", methods=["POST"])
@require_token
def withdraw(account_id):
    body = request.get_json() or {}
    amount = _parse_amount(body.get("amount"))
    description = body.get("description")
    idem_key = _idempotency_key()

    existing = _existing_for_idem(account_id, idem_key)
    if existing:
        return jsonify(message="Replay", data=existing.as_dict())

    for attempt in range(MAX_RETRIES):
        try:
            with account_lock([account_id]):
                txn = _post_single_sided(
                    account_id, "withdrawal", -amount, description, idem_key
                )
                db.session.commit()
            publish_transaction_event(
                {
                    "type": "withdrawal",
                    "account_id": account_id,
                    "amount": str(amount),
                    "transaction_id": txn.id,
                }
            )
            return jsonify(message="Withdrawal complete", data=txn.as_dict())
        except OperationalError as e:
            db.session.rollback()
            if "deadlock" in str(e).lower() and attempt < MAX_RETRIES - 1:
                continue
            raise DBException("Database busy, please retry")
        except IntegrityError as e:
            db.session.rollback()
            if "_account_balance_nonnegative" in str(e.orig):
                raise DBException("Insufficient funds", status_code=409)
            if idem_key and "_account_idem_uc" in str(e.orig):
                existing = _existing_for_idem(account_id, idem_key)
                if existing:
                    return jsonify(message="Replay", data=existing.as_dict())
            raise DBException("Constraint violation")


@custom_route("/account/<int:account_id>/transfer", methods=["POST"])
@require_token
def transfer(account_id):
    body = request.get_json() or {}
    amount = _parse_amount(body.get("amount"))
    description = body.get("description")
    idem_key = _idempotency_key()

    target_account_number = (body.get("to_account_number") or "").strip()
    if not target_account_number:
        raise DBException("to_account_number is required", status_code=400)

    source = Account.query.filter_by(
        id=account_id, user_id=request.user.id
    ).one_or_none()
    if not source:
        raise DBException("Source account not found", status_code=404)

    target = Account.query.filter_by(
        account_number=target_account_number
    ).one_or_none()
    if not target:
        raise DBException("Recipient account not found", status_code=404)

    if target.id == source.id:
        raise DBException("Cannot transfer to the same account", status_code=400)

    existing = _existing_for_idem(account_id, idem_key)
    if existing:
        return jsonify(message="Replay", data=existing.as_dict())

    transfer_id = str(uuid.uuid4())
    locked_ids = sorted([source.id, target.id])

    for attempt in range(MAX_RETRIES):
        try:
            with account_lock(locked_ids):
                # Re-fetch under lock in deterministic order
                rows = (
                    db.session.query(Account)
                    .filter(Account.id.in_(locked_ids))
                    .order_by(Account.id)
                    .with_for_update()
                    .all()
                )
                row_map = {a.id: a for a in rows}
                src = row_map[source.id]
                dst = row_map[target.id]

                if src.user_id != request.user.id:
                    raise DBException("Not authorized", status_code=403)

                new_src_balance = src.balance - amount
                if new_src_balance < 0:
                    raise DBException("Insufficient funds", status_code=409)

                new_dst_balance = dst.balance + amount
                src.balance = new_src_balance
                dst.balance = new_dst_balance

                out_txn = Transaction(
                    account_id=src.id,
                    counterparty_account_id=dst.id,
                    transfer_id=transfer_id,
                    kind="transfer_out",
                    amount=-amount,
                    balance_after=new_src_balance,
                    description=description,
                    idempotency_key=idem_key,
                )
                in_txn = Transaction(
                    account_id=dst.id,
                    counterparty_account_id=src.id,
                    transfer_id=transfer_id,
                    kind="transfer_in",
                    amount=amount,
                    balance_after=new_dst_balance,
                    description=description,
                )
                db.session.add(out_txn)
                db.session.add(in_txn)
                db.session.commit()

            publish_transaction_event(
                {
                    "type": "transfer",
                    "transfer_id": transfer_id,
                    "from_account_id": source.id,
                    "to_account_id": target.id,
                    "amount": str(amount),
                }
            )
            return jsonify(
                message="Transfer complete",
                data={"transfer_id": transfer_id, "transaction": out_txn.as_dict()},
            )
        except OperationalError as e:
            db.session.rollback()
            if "deadlock" in str(e).lower() and attempt < MAX_RETRIES - 1:
                continue
            raise DBException("Database busy, please retry")
        except StaleDataError:
            db.session.rollback()
            if attempt < MAX_RETRIES - 1:
                continue
            raise DBException("Concurrent update conflict")
        except IntegrityError as e:
            db.session.rollback()
            if "_account_balance_nonnegative" in str(e.orig):
                raise DBException("Insufficient funds", status_code=409)
            if idem_key and "_account_idem_uc" in str(e.orig):
                existing = _existing_for_idem(account_id, idem_key)
                if existing:
                    return jsonify(message="Replay", data=existing.as_dict())
            raise DBException("Constraint violation")
