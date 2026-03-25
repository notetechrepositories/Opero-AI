import sys
import os
sys.path.append(os.getcwd())

from app.db.database import users_collection

def check_users():
    users = list(users_collection.find())
    for u in users:
        print(f"Email: {u['email']}, Role: {u['role']}, Company: {u.get('company_id')}, Branch: {u.get('branch_id')}")

if __name__ == "__main__":
    check_users()
