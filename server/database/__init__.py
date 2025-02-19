from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)