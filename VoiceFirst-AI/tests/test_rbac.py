import sys
import os
sys.path.append(os.getcwd())

from app.db.database import companies_collection, branches_collection
from app.main import get_companies, get_analytics, get_branches
from unittest.mock import MagicMock

def test_rbac_enforcement():
    # Setup test data
    all_companies = list(companies_collection.find())
    if len(all_companies) < 2:
        print("Need at least 2 companies to verify RBAC.")
        return
        
    c1 = all_companies[0].get('company_code')
    c2 = all_companies[1].get('company_code')
    
    # 1. Test SuperAdmin
    super_admin = {"email": "super@example.com", "role": "SuperAdmin"}
    res_companies = get_companies(current_user=super_admin)
    print(f"SuperAdmin: Sees {len(res_companies)} companies (Expected: all)")
    
    # 2. Test CompanyAdmin
    company_admin = {"email": "admin@c1.com", "role": "CompanyAdmin", "company_id": c1}
    res_companies_ca = get_companies(current_user=company_admin)
    print(f"CompanyAdmin ({c1}): Sees {len(res_companies_ca)} companies (Expected: 1)")
    if len(res_companies_ca) == 1 and res_companies_ca[0].get('company_code') == c1:
        print("SUCCESS: CompanyAdmin filtering correctly.")
    else:
        print("ERROR: CompanyAdmin sees wrong/too many companies.")
        
    # 3. Test Staff Analytics
    branch = branches_collection.find_one({"company_code": c1})
    b1 = branch.get('branch_code') if branch else "B1"
    staff_user = {"email": "staff@c1.com", "role": "Staff", "company_id": c1, "branch_id": b1}
    
    # Check analytics for staff
    # get_analytics uses current_user.get("branch_id") if role == "Staff"
    res_analytics = get_analytics(company_id=None, current_user=staff_user)
    print(f"Staff ({c1}, {b1}): Successfully accessed analytics.")
    
    # 4. Test Branches Security
    res_branches = get_branches(company_code=c2, current_user=company_admin)
    for b in res_branches:
        if b.get('company_code') != c1:
             print(f"ERROR: CompanyAdmin ({c1}) saw branch {b.get('branch_code')} from company {b.get('company_code')}")
             return
    print("SUCCESS: Branch endpoint secured.")

if __name__ == "__main__":
    test_rbac_enforcement()
