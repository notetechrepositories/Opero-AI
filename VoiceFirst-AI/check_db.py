import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

_PROJECT_ROOT = Path(__file__).resolve().parent
_DOTENV_PATH = _PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=_DOTENV_PATH)

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["voicefirst_ai"]

def print_one(collection_name):
    print(f"--- {collection_name} ---")
    doc = db[collection_name].find_one({}, {"_id": 0})
    print(doc)

print_one("Companies")
print_one("Branches")
print_one("Section")
print_one("Issue_Type")
