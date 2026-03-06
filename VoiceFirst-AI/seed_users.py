import sys
sys.path.append('c:\\Users\\Admin\\Desktop\\VF-AI\\VoiceFirst-AI')
from app.db.database import users_collection
from app.services.auth_service import get_password_hash

users_to_seed = [
    {
        "email": "superadmin@vfai.com",
        "hashed_password": get_password_hash("admin123"),
        "role": "SuperAdmin",
        "company_id": None,
        "branch_id": None
    },
    {
        "email": "cmpadmin@example.com",
        "hashed_password": get_password_hash("cmp123"),
        "role": "CompanyAdmin",
        "company_id": "CMP001",
        "branch_id": None
    },
    {
        "email": "staffuser@example.com",
        "hashed_password": get_password_hash("staff123"),
        "role": "Staff",
        "company_id": "CMP001",
        "branch_id": "BR001"
    }
]

def seed():
    print("Seeding users...")
    users_collection.delete_many({})
    result = users_collection.insert_many(users_to_seed)
    print(f"Inserted {len(result.inserted_ids)} users.")
    for u in users_to_seed:
        print(f" - {u['email']} ({u['role']})")

if __name__ == "__main__":
    seed()
