from dotenv import load_dotenv
import os
import openai

# load environment variables from .env
load_dotenv()

# set the environment variables
openai.api_type = os.getenv("AZURE_OPENAI_API_TYPE", "azure")
openai.api_base = os.getenv("AZURE_OPENAI_API_ENDPOINT")
openai.api_version = os.getenv("AZURE_OPENAI_API_VERSION")
openai.api_key = os.getenv("AZURE_OPENAI_API_KEY")