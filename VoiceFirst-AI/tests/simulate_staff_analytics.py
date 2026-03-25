import requests
import json

BASE_URL = "http://localhost:8000" # Assuming it runs on 8000

def test_staff_analytics():
    # Login as Staff
    login_data = {"username": "staff@example.com", "password": "password123"}
    response = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.status_code} - {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Call analytics
    response = requests.get(f"{BASE_URL}/api/analytics", headers=headers)
    print(f"Analytics Response: {response.status_code}")
    print(f"Detail: {response.text}")

if __name__ == "__main__":
    # Note: This requires the server to be running.
    # Since I cannot easily start the server and keep it running for a script, 
    # I will instead check the DB and simulate the call logic in a script.
    pass
