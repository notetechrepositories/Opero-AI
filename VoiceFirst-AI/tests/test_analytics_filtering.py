import sys
import os
sys.path.append(os.getcwd())

from app.db.database import companies_collection, tickets_collection
from app.main import get_analytics
from unittest.mock import MagicMock

def test_analytics_filtering():
    # Find a company with tickets
    company = companies_collection.find_one()
    if not company:
        print("No companies found in database.")
        return
        
    company_code = company.get('company_code')
    print(f"Testing with company: {company_code}")
    
    # Mock current_user as SuperAdmin
    current_user = {"email": "admin@example.com", "role": "SuperAdmin"}
    
    # 1. Global Analytics
    global_res = get_analytics(company_id=None, current_user=current_user)
    print(f"Global Total: {global_res['summary']['total']}")
    
    # 2. Filtered Analytics
    filtered_res = get_analytics(company_id=company_code, current_user=current_user)
    print(f"Filtered Total for {company_code}: {filtered_res['summary']['total']}")
    
    # Verify filtering
    if filtered_res['summary']['total'] > global_res['summary']['total']:
        print("Error: Filtered count is greater than global count!")
    else:
        print("Backend filtering logic seems correct.")

if __name__ == "__main__":
    test_analytics_filtering()
