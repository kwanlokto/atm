from server.models import db
from sqlalchemy import CheckConstraint, UniqueConstraint


class Account(db.Model):
    __tablename__ = "account"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    account_number = db.Column(db.String(16), unique=True, nullable=False, index=True)
    account_type = db.Column(db.String(16), nullable=False, default="checking")
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    balance = db.Column(db.Numeric(precision=18, scale=2), nullable=False, default=0)
    version = db.Column(db.Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("name", "user_id", name="_user_account_name_uc"),
        CheckConstraint("balance >= 0", name="_account_balance_nonnegative"),
        CheckConstraint(
            "account_type in ('checking', 'savings')",
            name="_account_type_valid",
        ),
    )

    __mapper_args__ = {"version_id_col": version}

    def __repr__(self):
        return f"<Account {self.account_number} ({self.account_type})>"

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "account_number": self.account_number,
            "account_type": self.account_type,
            "user_id": self.user_id,
            "balance": str(self.balance),
            "version": self.version,
        }
