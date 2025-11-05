"""Add unique constraint on (name, user_id) to account

Revision ID: 6846d2c20402
Revises: 7bcfb72b789b
Create Date: 2025-11-05 02:54:13.147422

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6846d2c20402"
down_revision = "7bcfb72b789b"
branch_labels = None
depends_on = None


def upgrade():
    # Drop old unique constraint on "name" if it exists
    # The name of the old constraint might vary depending on your DB engine
    # You can find the exact name via: \d account (Postgres) or SHOW CREATE TABLE account; (MySQL)
    try:
        op.drop_constraint("name", "account", type_="unique")
    except Exception:
        # Some databases auto-name constraints, e.g. account_name_key (Postgres)
        # If needed, replace "account_name_key" with your actual constraint name
        op.drop_constraint("account_name_key", "account", type_="unique")

    # Create new composite unique constraint
    op.create_unique_constraint("_user_account_name_uc", "account", ["name", "user_id"])


def downgrade():
    # Remove composite constraint
    op.drop_constraint("_user_account_name_uc", "account", type_="unique")

    # Recreate the old unique constraint on "name"
    op.create_unique_constraint("account_name_key", "account", ["name"])
