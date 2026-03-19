import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.auth_service import get_password_hash

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["voicefirst_ai"]
users_collection = db["Users"]

# Trim all spaces in email addresses
all_users = list(users_collection.find())
for u in all_users:
    clean_email = u["email"].strip().lower()
    users_collection.update_one({"_id": u["_id"]}, {"$set": {"email": clean_email}})

# Reset passwords to admin123
new_hash = get_password_hash("admin123")
result = users_collection.update_many({}, {"$set": {"hashed_password": new_hash}})
print(f"Updated {result.modified_count} users to have password 'admin123'")

# Also insert the standard seed users if they don't exist
seed_users = [
    {
        "email": "superadmin@vfai.com",
        "hashed_password": new_hash,
        "role": "SuperAdmin",
        "company_id": None,
        "branch_id": None
    },
    {
        "email": "cmpadmin@example.com",
        "hashed_password": new_hash,
        "role": "CompanyAdmin",
        "company_id": "CMP001",
        "branch_id": None
    }
]

for su in seed_users:
    if not users_collection.find_one({"email": su["email"]}):
        users_collection.insert_one(su)
        print(f"Inserted missing standard seed user: {su['email']}")

users = list(users_collection.find({}, {"_id": 0}))
for u in users:
    print(u['email'], "-", "admin123")
