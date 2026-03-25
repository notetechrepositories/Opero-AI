import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

# Load .env relative to this file, not the current working directory.
# This prevents surprises when the server is started from a different folder.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]  # VoiceFirst-AI/
_DOTENV_PATH = _PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=_DOTENV_PATH)

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("MONGO_URI not found in environment variables")

client = MongoClient(MONGO_URI)

db = client["voicefirst_ai"]
tickets_collection = db["tickets"]
companies_collection = db["Companies"]       
branches_collection = db["Branches"]
sections_collection = db["Section"]
issue_types_collection = db["Issue_Type"]
users_collection = db["Users"]
