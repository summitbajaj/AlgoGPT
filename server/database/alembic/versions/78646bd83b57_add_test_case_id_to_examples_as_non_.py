"""Add test_case_id to examples as non-nullable

Revision ID: 78646bd83b57
Revises: 767eea0ed2e4
Create Date: 2025-02-23 17:23:22.656986
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = '78646bd83b57'
down_revision = '767eea0ed2e4'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1) (Optional) Insert a dummy test case if needed.
    #    Make sure the 'id' here won't conflict with existing rows.
    #    Also ensure problem_id is valid in your database:
    op.execute("""
        INSERT INTO test_cases (id, problem_id, input_data, expected_output, order_sensitive, benchmark_test_case)
        VALUES (99999, 1, '[]', '[]', FALSE, FALSE)
        ON CONFLICT DO NOTHING
    """)

    # 2) Add the new column as nullable
    op.add_column('examples', sa.Column('test_case_id', sa.Integer(), nullable=True))

    # 3) Populate all existing rows to point to the dummy test case (99999)
    #    or whatever ID you prefer if you have an existing test case you can reuse
    op.execute("""
        UPDATE examples
        SET test_case_id = 99999
        WHERE test_case_id IS NULL OR test_case_id IS NULL
    """)

    # 4) Now make the column non-null
    op.alter_column(
        'examples',
        'test_case_id',
        existing_type=sa.Integer(),
        nullable=False
    )

    # 5) Create the foreign key constraint
    op.create_foreign_key(
        'fk_examples_test_case_id_test_cases',
        'examples',
        'test_cases',
        ['test_case_id'],
        ['id']
    )

    # 6) Create a unique constraint to enforce one-to-one (if desired)
    op.create_unique_constraint(
        'uq_examples_test_case_id',
        'examples',
        ['test_case_id']
    )


def downgrade() -> None:
    # Reverse the operations
    op.drop_constraint('uq_examples_test_case_id', 'examples', type_='unique')
    op.drop_constraint('fk_examples_test_case_id_test_cases', 'examples', type_='foreignkey')
    op.alter_column('examples', 'test_case_id', nullable=True)
    op.execute("UPDATE examples SET test_case_id = NULL")
    op.drop_column('examples', 'test_case_id')

    # Optionally remove the dummy test case
    op.execute("DELETE FROM test_cases WHERE id=99999")
