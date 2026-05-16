import datetime

from server.models import db


def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


class Transaction(db.Model):
    """
    A signed ledger entry against a single account.

    For transfers, two rows are written in the same DB transaction with a shared
    `transfer_id` so the pair can be reconciled. For deposits/withdrawals,
    `transfer_id` and `counterparty_account_id` are NULL.
    """

    __tablename__ = "transaction"

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("account.id"), nullable=False, index=True)
    counterparty_account_id = db.Column(db.Integer, db.ForeignKey("account.id"), nullable=True)
    transfer_id = db.Column(db.String(64), nullable=True, index=True)

    kind = db.Column(db.String(16), nullable=False)  # deposit | withdrawal | transfer_in | transfer_out
    amount = db.Column(db.Numeric(precision=18, scale=2), nullable=False)  # signed: + credit, - debit
    balance_after = db.Column(db.Numeric(precision=18, scale=2), nullable=False)

    description = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(16), nullable=False, default="posted")  # posted | reversed
    idempotency_key = db.Column(db.String(64), nullable=True, index=True)

    created_at = db.Column(
        db.DateTime(timezone=True), default=_utcnow, nullable=False, index=True
    )

    __table_args__ = (
        db.UniqueConstraint(
            "account_id", "idempotency_key", name="_account_idem_uc"
        ),
        db.CheckConstraint(
            "kind in ('deposit', 'withdrawal', 'transfer_in', 'transfer_out')",
            name="_transaction_kind_valid",
        ),
    )

    def __repr__(self):
        return f"<Transaction {self.kind} {self.amount}>"

    def as_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "counterparty_account_id": self.counterparty_account_id,
            "transfer_id": self.transfer_id,
            "kind": self.kind,
            "amount": str(self.amount),
            "balance_after": str(self.balance_after),
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
