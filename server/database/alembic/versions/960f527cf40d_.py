"""empty message

Revision ID: 960f527cf40d
Revises: 78646bd83b57, c5957ee346ce
Create Date: 2025-02-25 14:56:11.849140

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '960f527cf40d'
down_revision: Union[str, None] = ('78646bd83b57', 'c5957ee346ce')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
