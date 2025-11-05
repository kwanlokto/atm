"""create dummy login

Revision ID: 7bcfb72b789b
Revises: 66e2e2850c0b
Create Date: 2025-11-03 19:47:33.909311

"""

from alembic import op
import sqlalchemy as sa
from werkzeug.security import generate_password_hash


# revision identifiers, used by Alembic.
revision = "7bcfb72b789b"
down_revision = "66e2e2850c0b"
branch_labels = None
depends_on = None

user_table = sa.table(
    "user",
    sa.Column("id", sa.Integer, nullable=False),
    sa.Column("first_name", sa.String(255), nullable=False),
    sa.Column("last_name", sa.String(255), nullable=False),
    sa.Column("email", sa.String(255), nullable=False, unique=True),
    sa.Column("password_hash", sa.String(255), nullable=True),
    sa.Column("access_token", sa.Text()),
)


def upgrade():
    # Define a lightweight table object for the "user" table
    conn = op.get_bind()

    # Insert a new user
    conn.execute(
        user_table.insert().values(
            first_name="Test",
            last_name="User",
            email="dummy@dummy.com",
            password_hash=generate_password_hash("password"),  # plaintext or pre-hashed
        )
    )


def downgrade():
    conn = op.get_bind()
    conn.execute(user_table.delete().where(user_table.c.email == "dummy@dummy.com"))
