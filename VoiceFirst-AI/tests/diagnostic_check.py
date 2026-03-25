
import requests
import json

BASE_URL = "http://localhost:8000"

def check_dashboard_as_staff():
    print("=== Diagnostic: Dashboard Authorization Check ===")
    
    # 1. Login as Staff
    print("\n1. Logging in as Staff (staffuser@example.com)...")
    login_data = {"username": "staffuser@example.com", "password": "staff123"}
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
        if response.status_code != 200:
            print(f"FAILED: Login failed with code {response.status_code}")
            print(f"Error: {response.text}")
            return
        
        login_json = response.json()
        token = login_json["access_token"]
        user_info = login_json["user"]
        print(f"SUCCESS: Logged in! Role: {user_info.get('role')}, Company: {user_info.get('company_id')}, Branch: {user_info.get('branch_id')}")
        
        # 2. Call Analytics endpoint
        print("\n2. Calling /api/analytics...")
        headers = {"Authorization": f"Bearer {token}"}
        # Dashboard calls with company_id for Staff
        payload = {"company_id": user_info.get('company_id')}
        
        analytics_response = requests.get(f"{BASE_URL}/api/analytics", headers=headers, params=payload)
        
        print(f"Response Status Code: {analytics_response.status_code}")
        
        if analytics_response.status_code == 200:
            print("SUCCESS: Endpoint returned 200 OK.")
            print(f"Summary: {analytics_response.json().get('summary')}")
            print("\nCONCLUSION: The backend logic is CORRECT and allows Staff to view analytics.")
        elif analytics_response.status_code == 403:
            print("FAILURE: Endpoint returned 403 Forbidden.")
            print(f"Error Detail: {analytics_response.json().get('detail')}")
            print("\nCONCLUSION: The backend is still blocking your user. Please ENSURE your server has reloaded with the latest main.py.")
        else:
            print(f"ERROR: Unexpected status code {analytics_response.status_code}")
            print(f"Error: {analytics_response.text}")
            
    except Exception as e:
        print(f"ERROR: Could not connect to the server. Is it running at {BASE_URL}?")
        print(f"Details: {str(e)}")

if __name__ == "__main__":
    check_dashboard_as_staff()
