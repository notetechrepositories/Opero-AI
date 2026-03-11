import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()  # loads from project root

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
