import os
import sys

# Add the project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.database import companies_collection, branches_collection, sections_collection, issue_types_collection

print("Company:", companies_collection.find_one())
print("Branch:", branches_collection.find_one())
print("Section:", sections_collection.find_one())
print("Issue Type:", issue_types_collection.find_one())
