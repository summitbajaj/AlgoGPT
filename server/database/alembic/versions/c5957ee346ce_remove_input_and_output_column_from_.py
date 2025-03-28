"""Remove input and output column from examples table

Revision ID: c5957ee346ce
Revises: ba36de9c3dff
Create Date: 2025-02-24 14:40:03.758908

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5957ee346ce'
down_revision: Union[str, None] = 'ba36de9c3dff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('examples', 'input_data')
    op.drop_column('examples', 'output_data')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('examples', sa.Column('output_data', sa.TEXT(), autoincrement=False, nullable=False))
    op.add_column('examples', sa.Column('input_data', sa.TEXT(), autoincrement=False, nullable=False))
    # ### end Alembic commands ###
