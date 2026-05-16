"""Banking v2: account types, account numbers, richer transactions, drop access_token

Revision ID: a1b2c3d4e5f6
Revises: 6846d2c20402
Create Date: 2026-05-15 00:00:00.000000

"""

import secrets

import sqlalchemy as sa
from alembic import op


revision = "a1b2c3d4e5f6"
down_revision = "6846d2c20402"
branch_labels = None
depends_on = None


def _gen_account_number():
    return "".join(secrets.choice("0123456789") for _ in range(12))


def upgrade():
    # ---- account ----
    op.add_column(
        "account",
        sa.Column("account_number", sa.String(16), nullable=True),
    )
    op.add_column(
        "account",
        sa.Column(
            "account_type",
            sa.String(16),
            nullable=False,
            server_default="checking",
        ),
    )
    op.add_column(
        "account",
        sa.Column("version", sa.Integer, nullable=False, server_default="0"),
    )

    # backfill account_number for existing rows
    conn = op.get_bind()
    existing = conn.execute(sa.text("SELECT id FROM account")).fetchall()
    used = set()
    for (acc_id,) in existing:
        while True:
            n = _gen_account_number()
            if n in used:
                continue
            try:
                conn.execute(
                    sa.text("UPDATE account SET account_number = :n WHERE id = :i"),
                    {"n": n, "i": acc_id},
                )
                used.add(n)
                break
            except Exception:
                continue

    op.alter_column("account", "account_number", nullable=False)
    op.create_unique_constraint("_account_number_uc", "account", ["account_number"])
    op.create_index("ix_account_account_number", "account", ["account_number"])
    op.create_index("ix_account_user_id", "account", ["user_id"])

    op.alter_column(
        "account",
        "balance",
        existing_type=sa.Numeric(),
        type_=sa.Numeric(precision=18, scale=2),
        nullable=False,
        server_default="0",
    )
    op.create_check_constraint(
        "_account_balance_nonnegative", "account", "balance >= 0"
    )
    op.create_check_constraint(
        "_account_type_valid",
        "account",
        "account_type in ('checking', 'savings')",
    )

    # ---- transaction ----
    # rename old columns we are replacing
    op.alter_column("transaction", "operation", new_column_name="kind_legacy")
    op.alter_column("transaction", "value", new_column_name="amount_legacy")

    op.add_column(
        "transaction",
        sa.Column(
            "kind", sa.String(16), nullable=False, server_default="deposit"
        ),
    )
    op.add_column(
        "transaction",
        sa.Column(
            "amount",
            sa.Numeric(precision=18, scale=2),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "transaction",
        sa.Column(
            "balance_after",
            sa.Numeric(precision=18, scale=2),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "transaction",
        sa.Column("counterparty_account_id", sa.Integer, nullable=True),
    )
    op.add_column(
        "transaction",
        sa.Column("transfer_id", sa.String(64), nullable=True),
    )
    op.add_column(
        "transaction",
        sa.Column("description", sa.String(255), nullable=True),
    )
    op.add_column(
        "transaction",
        sa.Column(
            "status", sa.String(16), nullable=False, server_default="posted"
        ),
    )
    op.add_column(
        "transaction",
        sa.Column("idempotency_key", sa.String(64), nullable=True),
    )

    # backfill from legacy columns: positive value -> deposit, negative -> withdrawal
    conn.execute(
        sa.text(
            """
            UPDATE transaction
            SET kind = CASE WHEN amount_legacy >= 0 THEN 'deposit' ELSE 'withdrawal' END,
                amount = amount_legacy
            """
        )
    )

    op.drop_column("transaction", "kind_legacy")
    op.drop_column("transaction", "amount_legacy")

    op.create_foreign_key(
        "fk_transaction_counterparty",
        "transaction",
        "account",
        ["counterparty_account_id"],
        ["id"],
    )
    op.create_index("ix_transaction_account_id", "transaction", ["account_id"])
    op.create_index("ix_transaction_transfer_id", "transaction", ["transfer_id"])
    op.create_index("ix_transaction_created_at", "transaction", ["created_at"])
    op.create_index(
        "ix_transaction_idempotency_key", "transaction", ["idempotency_key"]
    )
    op.create_unique_constraint(
        "_account_idem_uc",
        "transaction",
        ["account_id", "idempotency_key"],
    )
    op.create_check_constraint(
        "_transaction_kind_valid",
        "transaction",
        "kind in ('deposit', 'withdrawal', 'transfer_in', 'transfer_out')",
    )

    # Seed a starter account for the dummy user, if present.
    dummy = conn.execute(
        sa.text("SELECT id FROM \"user\" WHERE email = :e"),
        {"e": "dummy@dummy.com"},
    ).fetchone()
    if dummy:
        already = conn.execute(
            sa.text("SELECT 1 FROM account WHERE user_id = :u LIMIT 1"),
            {"u": dummy[0]},
        ).fetchone()
        if not already:
            for _ in range(5):
                try:
                    conn.execute(
                        sa.text(
                            "INSERT INTO account "
                            "(name, account_number, account_type, user_id, balance, version) "
                            "VALUES (:n, :num, 'checking', :u, 1000.00, 0)"
                        ),
                        {"n": "Primary Checking", "num": _gen_account_number(), "u": dummy[0]},
                    )
                    break
                except Exception:
                    continue

    # ---- user: drop access_token (sessions live in Redis now) ----
    op.drop_column("user", "access_token")


def downgrade():
    op.add_column("user", sa.Column("access_token", sa.Text(), nullable=True))

    op.drop_constraint("_transaction_kind_valid", "transaction", type_="check")
    op.drop_constraint("_account_idem_uc", "transaction", type_="unique")
    op.drop_index("ix_transaction_idempotency_key", table_name="transaction")
    op.drop_index("ix_transaction_created_at", table_name="transaction")
    op.drop_index("ix_transaction_transfer_id", table_name="transaction")
    op.drop_index("ix_transaction_account_id", table_name="transaction")
    op.drop_constraint(
        "fk_transaction_counterparty", "transaction", type_="foreignkey"
    )

    op.add_column(
        "transaction",
        sa.Column("operation", sa.String(255), nullable=True),
    )
    op.add_column(
        "transaction",
        sa.Column("value", sa.Numeric(), nullable=True),
    )
    op.execute(
        "UPDATE transaction SET operation = kind, value = amount"
    )
    op.alter_column("transaction", "operation", nullable=False)
    op.alter_column("transaction", "value", nullable=False)

    op.drop_column("transaction", "idempotency_key")
    op.drop_column("transaction", "status")
    op.drop_column("transaction", "description")
    op.drop_column("transaction", "transfer_id")
    op.drop_column("transaction", "counterparty_account_id")
    op.drop_column("transaction", "balance_after")
    op.drop_column("transaction", "amount")
    op.drop_column("transaction", "kind")

    op.drop_constraint("_account_type_valid", "account", type_="check")
    op.drop_constraint("_account_balance_nonnegative", "account", type_="check")
    op.drop_index("ix_account_user_id", table_name="account")
    op.drop_index("ix_account_account_number", table_name="account")
    op.drop_constraint("_account_number_uc", "account", type_="unique")
    op.drop_column("account", "version")
    op.drop_column("account", "account_type")
    op.drop_column("account", "account_number")
