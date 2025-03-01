"""Change status to use enums

Revision ID: 6d5a08430bc2
Revises: bc84aea260d8
Create Date: 2025-02-28 23:51:19.900969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '6d5a08430bc2'
down_revision: Union[str, None] = 'bc84aea260d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type if it does not exist.
    submission_status = postgresql.ENUM(
        'ACCEPTED',
        'WRONG_ANSWER',
        'RUNTIME_ERROR',
        'TIME_LIMIT_EXCEEDED',
        'COMPILATION_ERROR',
        name='submissionstatus'
    )
    submission_status.create(op.get_bind(), checkfirst=True)

    # Now alter the column in submissions table with conversion.
    op.alter_column(
        'submissions', 'status',
        type_=sa.Enum(
            'ACCEPTED',
            'WRONG_ANSWER',
            'RUNTIME_ERROR',
            'TIME_LIMIT_EXCEEDED',
            'COMPILATION_ERROR',
            name='submissionstatus'
        ),
        existing_nullable=False,
        postgresql_using="status::submissionstatus"
    )

    # Alter the column in submission_test_results table with conversion.
    op.alter_column(
        'submission_test_results', 'status',
        type_=sa.Enum(
            'ACCEPTED',
            'WRONG_ANSWER',
            'RUNTIME_ERROR',
            'TIME_LIMIT_EXCEEDED',
            'COMPILATION_ERROR',
            name='submissionstatus'
        ),
        existing_nullable=False,
        postgresql_using="status::submissionstatus"
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # Revert the column changes as needed.
    op.alter_column('submissions', 'status',
               type_=sa.String(),
               existing_nullable=False)
    op.alter_column('submission_test_results', 'status',
               type_=sa.String(),
               existing_nullable=False)

    # Drop the enum type.
    submission_status = postgresql.ENUM(
        'ACCEPTED',
        'WRONG_ANSWER',
        'RUNTIME_ERROR',
        'TIME_LIMIT_EXCEEDED',
        'COMPILATION_ERROR',
        name='submissionstatus'
    )
    submission_status.drop(op.get_bind(), checkfirst=True)
    # ### end Alembic commands ###
