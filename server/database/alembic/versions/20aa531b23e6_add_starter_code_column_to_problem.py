"""Add starter_code column to Problem

Revision ID: 20aa531b23e6
Revises: 4b588b86da7a
Create Date: 2025-02-11 22:50:03.284894

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20aa531b23e6'
down_revision: Union[str, None] = '4b588b86da7a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Add 'starter_code' column to 'problems' table
    op.add_column("problems", sa.Column("starter_code", sa.Text(), nullable=True))

def downgrade():
    # Remove 'starter_code' column if rolling back
    op.drop_column("problems", "starter_code")
    # ### end Alembic commands ###
