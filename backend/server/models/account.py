from server.models import db
from sqlalchemy import UniqueConstraint


class Account(db.Model):
    __tablename__ = "account"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    balance = db.Column(db.Numeric, default=0)

    __table_args__ = (
        UniqueConstraint("name", "user_id", name="_user_account_name_uc"),
    )

    def __repr__(self):
        return f"<Account {self.name}>"

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
