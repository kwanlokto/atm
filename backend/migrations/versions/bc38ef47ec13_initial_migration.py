"""Initial Migration

Revision ID: bc38ef47ec13
Revises:
Create Date: 2021-04-16 16:55:53.587323

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "bc38ef47ec13"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user",
        sa.Column("id", sa.Integer, nullable=False),
        sa.Column("first_name", sa.String(255), nullable=False),
        sa.Column("last_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("access_token", sa.Text()),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "account",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), unique=True, nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("balance", sa.Numeric, default=0),
    )

    op.create_table(
        "transaction",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("account_id", sa.Integer, sa.ForeignKey("account.id"), nullable=False),
        sa.Column("operation", sa.String(255), nullable=False),
        sa.Column("value", sa.Numeric, nullable=False),
    )


def downgrade():
    op.drop_table("transaction")
    op.drop_table("account")
    op.drop_table("user")
