"""Migrate user-related models to use Firestore string IDs

Revision ID: c5f8436038ce
Revises: d1b24e697031
Create Date: 2025-03-18 01:06:21.787757

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c5f8436038ce'
down_revision: Union[str, None] = 'd1b24e697031'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### First drop the foreign key constraints ###
    op.drop_constraint('chat_sessions_student_id_fkey', 'chat_sessions', type_='foreignkey')
    op.drop_constraint('student_topic_mastery_student_profile_id_fkey', 'student_topic_mastery', type_='foreignkey')
    
    # ### Change the parent table first ###
    op.alter_column('student_profiles', 'id',
               existing_type=sa.UUID(),
               type_=sa.String(),
               existing_nullable=False)
    op.drop_index('ix_student_profiles_user_id', table_name='student_profiles')
    op.drop_column('student_profiles', 'user_id')
    
    # ### Then change the referencing tables ###
    op.alter_column('chat_sessions', 'student_id',
               existing_type=sa.UUID(),
               type_=sa.String(),
               existing_nullable=False)
    op.create_index(op.f('ix_chat_sessions_student_id'), 'chat_sessions', ['student_id'], unique=False)
    
    op.alter_column('student_attempts', 'student_id',
               existing_type=sa.UUID(),
               type_=sa.String(),
               existing_nullable=False)
    
    op.alter_column('student_topic_mastery', 'student_profile_id',
               existing_type=sa.UUID(),
               type_=sa.String(),
               existing_nullable=False)
    op.drop_constraint('uix_student_topic', 'student_topic_mastery', type_='unique')
    op.drop_column('student_topic_mastery', 'id')
    
    # ### Recreate the foreign key constraints ###
    op.create_foreign_key('chat_sessions_student_id_fkey', 'chat_sessions', 'student_profiles', ['student_id'], ['id'])
    op.create_foreign_key('student_topic_mastery_student_profile_id_fkey', 'student_topic_mastery', 'student_profiles', ['student_profile_id'], ['id'])


def downgrade() -> None:
    # ### First drop the foreign key constraints ###
    op.drop_constraint('chat_sessions_student_id_fkey', 'chat_sessions', type_='foreignkey')
    op.drop_constraint('student_topic_mastery_student_profile_id_fkey', 'student_topic_mastery', type_='foreignkey')
    
    # ### Restore columns and constraints in correct order ###
    op.add_column('student_topic_mastery', sa.Column('id', sa.UUID(), autoincrement=False, nullable=False))
    op.create_unique_constraint('uix_student_topic', 'student_topic_mastery', ['student_profile_id', 'topic_id'])
    
    # ### Change the referencing tables back first ###
    op.alter_column('student_topic_mastery', 'student_profile_id',
               existing_type=sa.String(),
               type_=sa.UUID(),
               existing_nullable=False)
               
    op.alter_column('student_attempts', 'student_id',
               existing_type=sa.String(),
               type_=sa.UUID(),
               existing_nullable=False)
               
    op.drop_index(op.f('ix_chat_sessions_student_id'), table_name='chat_sessions')
    op.alter_column('chat_sessions', 'student_id',
               existing_type=sa.String(),
               type_=sa.UUID(),
               existing_nullable=False)
    
    # ### Then change the parent table ###
    op.add_column('student_profiles', sa.Column('user_id', sa.UUID(), autoincrement=False, nullable=False))
    op.create_index('ix_student_profiles_user_id', 'student_profiles', ['user_id'], unique=False)
    op.alter_column('student_profiles', 'id',
               existing_type=sa.String(),
               type_=sa.UUID(),
               existing_nullable=False)
    
    # ### Recreate the foreign key constraints ###
    op.create_foreign_key('chat_sessions_student_id_fkey', 'chat_sessions', 'student_profiles', ['student_id'], ['id'])
    op.create_foreign_key('student_topic_mastery_student_profile_id_fkey', 'student_topic_mastery', 'student_profiles', ['student_profile_id'], ['id'])