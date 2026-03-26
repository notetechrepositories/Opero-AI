import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    print("MONGO_URI not found in .env")
    exit(1)

client = MongoClient(MONGO_URI)
db = client["voicefirst_ai"]
users_collection = db["Users"]

users = list(users_collection.find({}, {"_id": 0}))
print(f"Found {len(users)} users:")
for u in users:
    print(u)
