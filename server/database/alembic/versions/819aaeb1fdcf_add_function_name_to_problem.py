"""Add function_name to Problem

Revision ID: 819aaeb1fdcf
Revises: 20aa531b23e6
Create Date: 2025-02-16 16:16:16.055163

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '819aaeb1fdcf'
down_revision: Union[str, None] = '20aa531b23e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('problems', sa.Column('function_name', sa.String(), nullable=False, server_default='default'))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('problems', 'function_name')
    # ### end Alembic commands ###
