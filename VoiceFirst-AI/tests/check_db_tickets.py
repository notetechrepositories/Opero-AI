import sys
import os
sys.path.append(os.getcwd())

from app.db.database import tickets_collection

def check_tickets():
    ticket = tickets_collection.find_one()
    if ticket:
        print(f"Sample Ticket Keys: {ticket.keys()}")
        print(f"Company ID: {ticket.get('company_id')}")
        print(f"Branch ID: {ticket.get('branch_id')}")
    else:
        print("No tickets found.")

if __name__ == "__main__":
    check_tickets()
