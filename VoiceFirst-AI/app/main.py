
from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from itsdangerous import URLSafeSerializer, BadSignature
import os
import json
import base64
import re
import uuid
from pydantic import BaseModel
from app.db.database import (
    tickets_collection,
    companies_collection,
    branches_collection,
    sections_collection,
    issue_types_collection
)
from datetime import datetime, timedelta
from app.services.ai_service import classify_with_ai, generate_insights, analyze_image_with_llava
from app.services.auth_service import verify_password, create_access_token, get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES
from pymongo import DESCENDING, ASCENDING
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from fastapi import Request, File, UploadFile
from app.services.whatsapp_service import send_whatsapp_message
import secrets
import hashlib
from urllib.parse import urlencode




class TicketRequest(BaseModel):
    company_id : str
    branch_id : str
    section_id : str
    issue_type_id : str
    message : str
    category: Optional[str] = None
    priority: Optional[str] = None
    imageurl: Optional[str] = None

# We can use the same secret key from auth_service, or define a new one specifically for QR tokens.
# Using a fixed secret for this example. In production, this should come from env variables.
QR_SECRET_KEY = os.environ.get("QR_SECRET_KEY", "your-very-secret-qr-key-here-123")
qr_serializer = URLSafeSerializer(QR_SECRET_KEY)

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    company_id: Optional[str] = None
    branch_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    company_id: Optional[str] = None
    branch_id: Optional[str] = None


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for EC2 deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_CATEGORIES = [
    "Cleanliness",
    "Food Quality",
    "Service",
    "Staff Behavior",
    "Billing Issue",
    "Delay / Waiting Time",
    "Maintenance",
    "Facilities",
    "Appointment Issue",
    "General Complaint",
    "Feedback / Suggestion",
    "Other",
]

ALLOWED_PRIORITIES = ["High", "Medium", "Low"]

def _normalize_for_match(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"\s*/\s*", "/", value)  # normalize "Delay / Waiting Time"
    value = re.sub(r"\s+", " ", value)
    return value

def _map_to_allowed(value: Optional[str], allowed: List[str]) -> Optional[str]:
    if value is None:
        return None
    candidate = _normalize_for_match(value)
    for a in allowed:
        if _normalize_for_match(a) == candidate:
            return a
    return None

@app.post("/api/auth/login")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    from app.db.database import users_collection
    # Trim whitespace from the email just in case the frontend sends a trailing space
    username = form_data.username.strip().lower() if form_data.username else form_data.username
    print(f"Login attempt for email: '{username}' with password length: {len(form_data.password)}")
    
    # OAuth2PasswordRequestForm strictly uses "username" as the field name, but we will pass an email into it from the frontend
    user = users_collection.find_one({"email": username})
    
    if not user:
        print(f"User not found for email: '{username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(form_data.password, user["hashed_password"]):
        print(f"Password mismatch for user: '{username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    print(f"Login successful for user: '{username}'")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user.get("role"), "company_id": user.get("company_id")}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": user["email"], "role": user.get("role"), "company_id": user.get("company_id"), "branch_id": user.get("branch_id")}}


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


@app.post("/api/auth/request-password-reset")
def request_password_reset(req: PasswordResetRequest):
    """
    Generates a one-time password reset token and emails a reset link.
    Stores only a hash of the token in MongoDB, with an expiry.
    """
    from app.db.database import users_collection
    from app.services.email_service import send_password_reset_email

    email = (req.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=30)

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_reset": {"token_hash": token_hash, "expires_at": expires_at, "used": False}}},
    )

    frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    query = urlencode({"token": raw_token})
    reset_link = f"{frontend_base_url}/reset-password?{query}"

    try:
        send_password_reset_email(email, reset_link)
    except Exception as e:
        # If SMTP is not configured, allow local/dev testing without blocking the UI.
        email_mode = os.getenv("EMAIL_MODE", "").strip().lower() or "smtp"
        if email_mode in ("console", "log", "stdout"):
            return {"status": "success", "message": "Password reset link generated (check server logs)."}
        raise HTTPException(status_code=500, detail=f"Failed to send reset email: {str(e)}")

    return {"status": "success", "message": "Password reset link sent to your email."}


@app.post("/api/auth/reset-password")
def reset_password(req: PasswordResetConfirm):
    from app.db.database import users_collection
    from app.services.auth_service import get_password_hash

    token = (req.token or "").strip()
    new_password = (req.new_password or "").strip()

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not token:
        raise HTTPException(status_code=400, detail="Missing reset token.")

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    user = users_collection.find_one({"password_reset.token_hash": token_hash})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    pr = user.get("password_reset") or {}
    if pr.get("used") is True:
        raise HTTPException(status_code=400, detail="This reset link has already been used.")
    expires_at = pr.get("expires_at")
    if not expires_at or expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    hashed_pw = get_password_hash(new_password)
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": hashed_pw, "password_reset.used": True}},
    )

    return {"status": "success", "message": "Password updated successfully."}

@app.get("/api/users", response_model=List[UserResponse])
def get_users(current_user: dict = Depends(get_current_active_user)):
    from app.db.database import users_collection
    user_role = current_user.get("role")
    
    if user_role == "Staff":
        raise HTTPException(status_code=403, detail="Staff cannot view users")
        
    query = {}
    if user_role == "CompanyAdmin":
        query["company_id"] = current_user.get("company_id")
        
    users = list(users_collection.find(query))
    response = []
    for u in users:
        response.append(UserResponse(
            id=str(u["_id"]),
            email=u["email"],
            role=u["role"],
            company_id=u.get("company_id"),
            branch_id=u.get("branch_id")
        ))
    return response

@app.post("/api/users", response_model=UserResponse)
def create_user(user_req: UserCreate, current_user: dict = Depends(get_current_active_user)):
    from app.db.database import users_collection
    from app.services.auth_service import get_password_hash
    
    current_role = current_user.get("role")
    target_role = user_req.role
    
    if current_role == "Staff":
        raise HTTPException(status_code=403, detail="Staff cannot create users")
        
    if current_role == "CompanyAdmin":
        if target_role != "Staff":
            raise HTTPException(status_code=403, detail="CompanyAdmins can only create Staff users")
        if user_req.company_id != current_user.get("company_id"):
            raise HTTPException(status_code=403, detail="CompanyAdmins can only create users for their own company")
            
    if target_role not in ["SuperAdmin", "CompanyAdmin", "Staff"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
        
    # Check if email exists
    if users_collection.find_one({"email": user_req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_data = {
        "email": user_req.email,
        "hashed_password": get_password_hash(user_req.password),
        "role": user_req.role,
        "company_id": user_req.company_id,
        "branch_id": user_req.branch_id
    }
    
    result = users_collection.insert_one(user_data)
    
    return UserResponse(
        id=str(result.inserted_id),
        email=user_req.email,
        role=user_req.role,
        company_id=user_req.company_id,
        branch_id=user_req.branch_id
    )

class PasswordChangeRequest(BaseModel):
    new_password: str

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(get_current_active_user)):
    from app.db.database import users_collection
    from bson.objectid import ObjectId
    from bson.errors import InvalidId
    
    current_role = current_user.get("role")
    if current_role == "Staff":
        raise HTTPException(status_code=403, detail="Staff cannot delete users")
        
    try:
        obj_id = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user ID")
        
    target_user = users_collection.find_one({"_id": obj_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if current_role == "CompanyAdmin":
        if target_user.get("role") != "Staff":
            raise HTTPException(status_code=403, detail="CompanyAdmins can only delete Staff users")
        if target_user.get("company_id") != current_user.get("company_id"):
            raise HTTPException(status_code=403, detail="CompanyAdmins can only delete users in their own company")
            
    users_collection.delete_one({"_id": obj_id})
    return {"status": "success", "message": "User deleted successfully"}

@app.put("/api/users/{user_id}/password")
def change_password(user_id: str, req: PasswordChangeRequest, current_user: dict = Depends(get_current_active_user)):
    from app.db.database import users_collection
    from app.services.auth_service import get_password_hash
    from bson.objectid import ObjectId
    from bson.errors import InvalidId
    
    current_role = current_user.get("role")
    if current_role == "Staff":
        raise HTTPException(status_code=403, detail="Staff cannot change passwords")
        
    try:
        obj_id = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user ID")
        
    target_user = users_collection.find_one({"_id": obj_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if current_role == "CompanyAdmin":
        if target_user.get("role") != "Staff":
            raise HTTPException(status_code=403, detail="CompanyAdmins can only change passwords for Staff users")
        if target_user.get("company_id") != current_user.get("company_id"):
            raise HTTPException(status_code=403, detail="CompanyAdmins can only change passwords for users in their own company")
            
    hashed_pw = get_password_hash(req.new_password)
    users_collection.update_one({"_id": obj_id}, {"$set": {"hashed_password": hashed_pw}})
    return {"status": "success", "message": "Password updated successfully"}

@app.get("/api/tickets")
def get_tickets(
    company_id : Optional[str] = None,
    branch_id : Optional[str] = None,
    priority : Optional[str] = None,
    status : Optional[str] = None,
    sort: str = "latest",
    current_user: dict = Depends(get_current_active_user)
):
    query = {}
    user_role = current_user.get("role")
    
    # Enforce role logic
    if user_role == "CompanyAdmin":
        query["company_id"] = current_user.get("company_id")
    elif user_role == "Staff":
        query["company_id"] = current_user.get("company_id")
        query["branch_id"] = current_user.get("branch_id")
    else: # SuperAdmin
        if company_id:
            query["company_id"] = company_id.upper()
        if branch_id:
            query["branch_id"] = branch_id.upper()

    if priority:
        query["priority"] = priority.capitalize()
    if status:
        query["status"] = status.capitalize()

    tickets = list(tickets_collection.find(query))

    for ticket in tickets:
        ticket["_id"] = str(ticket["_id"])

    if sort == "latest":
        tickets.sort(key=lambda x: x["created_at"], reverse=True)
    elif sort == "oldest":
        tickets.sort(key=lambda x: x["created_at"])
    elif sort == "priority":
        tickets.sort(key=lambda x: x["priority"])

    return tickets

@app.get("/api/companies")
def get_companies():
    companies = list(companies_collection.find({}, {"_id": 0}))
    return companies

@app.get("/api/branches")
def get_branches(company_code: Optional[str] = None):
    query = {}
    if company_code:
        query["company_code"] = company_code
    branches = list(branches_collection.find(query, {"_id": 0}))
    return branches

@app.get("/api/sections")
def get_sections(branch_code: Optional[str] = None):
    query = {}
    if branch_code:
        query["branch_code"] = branch_code
    sections = list(sections_collection.find(query, {"_id": 0}))
    return sections

@app.get("/api/issue-types")
def get_issue_types(section_code: Optional[str] = None):
    query = {}
    if section_code:
        query["section_code"] = section_code
    issue_types = list(issue_types_collection.find(query, {"_id": 0}))
    return issue_types

# Request model for generating a secure token
class QRTokenRequest(BaseModel):
    company_id: str
    branch_id: str

# POST endpoint to generate a secure, tamper-proof token for a branch QR code
# This prevents users from scraping company and branch IDs directly from QR outputs
@app.post("/api/generate-qr-token")
def generate_qr_token(
    request: QRTokenRequest,
    current_user: dict = Depends(get_current_active_user)
):
    # Only admins can generate these tokens to restrict QR creation
    user_role = current_user.get("role")
    if user_role not in ["SuperAdmin", "CompanyAdmin"]:
        raise HTTPException(status_code=403, detail="Not authorized to generate QR tokens")
        
    # Create the JSON payload that we want to encode
    payload = {
        "company_id": request.company_id,
        "branch_id": request.branch_id
    }
    # itsdangerous module encrypts and signs this payload using the server's secret key
    # Output token looks like a random string, masking the true IDs
    token = qr_serializer.dumps(payload)
    return {"token": token}

# GET endpoint for the frontend to validate and unpack a scanned QR token
# This is a public endpoint because users scanning the QR code need to decode it
@app.get("/api/validate-qr-token")
def validate_qr_token(token: str = Query(..., description="The secure QR token")):
    try:
        # Decrypts and verifies the signature of the token
        payload = qr_serializer.loads(token)
        return {
            "company_id": payload.get("company_id"),
            "branch_id": payload.get("branch_id")
        }
    except BadSignature:
        # Throws 400 Bad Request if the token was tampered with or generated by a different secret key
        raise HTTPException(status_code=400, detail="Invalid token")

@app.get("/api/analytics")
def get_analytics(
    current_user: dict = Depends(get_current_active_user)
):
    user_role = current_user.get("role")
    if user_role == "Staff":
        raise HTTPException(status_code=403, detail="Not authorized to view analytics dashboard")
        
    query = {}
    if user_role == "CompanyAdmin":
        query["company_id"] = current_user.get("company_id")

    # Total tickets
    total_tickets = tickets_collection.count_documents(query)

    # Status breakdown
    open_tickets = tickets_collection.count_documents({**query, "status": "Open"})
    closed_tickets = tickets_collection.count_documents({**query, "status": "Closed"})
    in_progress_tickets = tickets_collection.count_documents({**query, "status": "In Progress"})
    resolved_tickets = tickets_collection.count_documents({**query, "status": "Resolved"})

    # Priority breakdown (using aggregation)
    pipeline_priority = []
    if query:
        pipeline_priority.append({"$match": query})
    pipeline_priority.append({"$group": {"_id": "$priority", "count": {"$sum": 1}}})
    
    priority_results = list(tickets_collection.aggregate(pipeline_priority))
    priority_breakdown = []
    for r in priority_results:
        name = r["_id"] if r.get("_id") else "Unassigned"
        existing = next((item for item in priority_breakdown if item["name"] == name), None)
        if existing:
            existing["value"] += r["count"]
        else:
            priority_breakdown.append({"name": name, "value": r["count"]})

    # Category breakdown (using aggregation)
    pipeline_category = []
    if query:
        pipeline_category.append({"$match": query})
    pipeline_category.append({"$group": {"_id": "$category", "count": {"$sum": 1}}})
    
    category_results = list(tickets_collection.aggregate(pipeline_category))
    category_breakdown = []
    for r in category_results:
        name = r["_id"] if r.get("_id") else "Uncategorized"
        existing = next((item for item in category_breakdown if item["name"] == name), None)
        if existing:
            existing["value"] += r["count"]
        else:
            category_breakdown.append({"name": name, "value": r["count"]})

    return {
        "summary": {
            "total": total_tickets,
            "open": open_tickets,
            "closed": closed_tickets,
            "inProgress": in_progress_tickets,
            "resolved": resolved_tickets
        },
        "priorityBreakdown": priority_breakdown,
        "categoryBreakdown": category_breakdown
    }


@app.post("/api/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """
    Receives an image, converts to base64, and calls the vision model for analysis.
    """
    contents = await file.read()
    filename = (file.filename or "").strip()
    ext = ""
    if "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()

    content_type = (file.content_type or "").lower()
    # If extension is missing/unusable, fall back to content-type.
    if ext not in {"jpg", "jpeg", "png"}:
        if content_type in {"image/jpeg", "image/jpg"}:
            ext = "jpg"
        elif content_type == "image/png":
            ext = "png"

    if ext not in {"jpg", "jpeg", "png"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Upload JPG or PNG. (filename='{filename}', content_type='{content_type}')",
        )

    uploads_images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads", "images"))
    os.makedirs(uploads_images_dir, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}.{ext if ext != 'jpeg' else 'jpg'}"
    stored_path = os.path.join(uploads_images_dir, stored_filename)

    with open(stored_path, "wb") as f:
        f.write(contents)

    image_base64 = base64.b64encode(contents).decode("utf-8")
    analysis = analyze_image_with_llava(image_base64)

    # Frontend will use this to show/store on the ticket record.
    image_url = f"/uploads/images/{stored_filename}"
    return {**analysis, "image_url": image_url}


@app.post("/api/classify")
def classify_ticket(request: TicketRequest):

    # 1. Validate Company
    company = companies_collection.find_one({"company_code": request.company_id})
    if not company:
        raise HTTPException(status_code=400, detail=f"Invalid company '{request.company_id}'.")

    # 2. Validate Branch belongs to Company
    if request.branch_id:
        branch = branches_collection.find_one({"branch_code": request.branch_id, "company_code": request.company_id})
        if not branch:
            raise HTTPException(status_code=400, detail=f"Branch '{request.branch_id}' does not belong to Company '{request.company_id}' or does not exist.")

    # 3. Validate Section belongs to Branch
    if request.section_id:
        section = sections_collection.find_one({"section_code": request.section_id, "branch_code": request.branch_id})
        if not section:
            raise HTTPException(status_code=400, detail=f"Section '{request.section_id}' does not belong to Branch '{request.branch_id}' or does not exist.")

    # 4. Validate Issue Type belongs to Section
    if request.issue_type_id:
        issue_type = issue_types_collection.find_one({
            "$or": [{"issue_type_id": request.issue_type_id}, {"issue_type_code": request.issue_type_id}],
            "section_code": request.section_id
        })
        if not issue_type:
            raise HTTPException(status_code=400, detail=f"Issue Type '{request.issue_type_id}' does not belong to Section '{request.section_id}' or does not exist.")

    # If image analysis already provided category/priority, skip re-classifying.
    ai_result = {}
    if not request.category or not request.priority:
        ai_result = classify_with_ai(request.message)
        if "error" in ai_result:
            return {"error": "AI classification failed", "details": ai_result["error"]}

    category_raw = request.category or ai_result.get("category", "General Complaint")
    priority_raw = request.priority or ai_result.get("priority", "Medium")

    # Clamp values to allowed lists (case-insensitive).
    category = _map_to_allowed(category_raw, ALLOWED_CATEGORIES) or "General Complaint"
    priority = _map_to_allowed(priority_raw, ALLOWED_PRIORITIES) or "Medium"

    summary = ai_result.get("summary") if isinstance(ai_result, dict) else None
    if not summary:
        # For image-based tickets, default summary to the extracted issue keyword.
        summary = request.message.strip() if isinstance(request.message, str) else "NO summary provided"



    ticket_data = {
        "company_id": request.company_id,
        "branch_id": request.branch_id,
        "section_id": request.section_id,
        "issue_type_id": request.issue_type_id,
        "message": request.message,
        "category": category,
        "priority": priority,
        "summary": summary,
        "status": "Open",   
        "created_at": datetime.utcnow()
    }

    if request.imageurl:
        ticket_data["imageurl"] = request.imageurl

    result = tickets_collection.insert_one(ticket_data)

    # ticket_data is modified in-place by insert_one and now contains `_id` (ObjectId)
    # We must remove it or convert it to string before returning, as ObjectId is not JSON serializable.
    ticket_data.pop("_id", None)

    response_data = {
        **ticket_data,
        "inserted_id": str(result.inserted_id)
    }

    return response_data

@app.get("/api/ai-insights/{company_id}")
def get_ai_insights(
    company_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    user_role = current_user.get("role")
    if user_role == "Staff":
        raise HTTPException(status_code=403, detail="Not authorized to view AI Insights")
    if user_role == "CompanyAdmin" and current_user.get("company_id") != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to view AI Insights for this company")
        
    # Fetch recent tickets for the company
    tickets = list(tickets_collection.find({"company_id": company_id.upper()}).sort("created_at", DESCENDING).limit(50))
    
    if not tickets:
        raise HTTPException(status_code=404, detail="No tickets found for this company")
        
    formatted_tickets = []
    for t in tickets:
        formatted_tickets.append({
            "category": t.get("category"),
            "priority": t.get("priority"),
            "status": t.get("status"),
            "message": t.get("message")
        })
        
    tickets_json = json.dumps(formatted_tickets)
    insights = generate_insights(tickets_json)
    
    if "error" in insights:
        raise HTTPException(status_code=500, detail=insights["error"])
        
    return insights

@app.get("/api/whatsapp/webhook")
def verify_whatsapp_webhook(request: Request):
    query_params = request.query_params
    verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    
    mode = query_params.get("hub.mode")
    token = query_params.get("hub.verify_token")
    challenge = query_params.get("hub.challenge")
    
    if mode == "subscribe" and token == verify_token:
        # WhatsApp expects exactly the integer token back
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=str(challenge), status_code=200)
    
    raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/api/whatsapp/webhook")
async def handle_whatsapp_webhook(request: Request):
    body = await request.json()
    
    print("====== INCOMING LAMBDA WEBHOOK ======")
    import json
    print(json.dumps(body, indent=2))
    print("=====================================")
    
    if "object" in body and body["object"] == "whatsapp_business_account":
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                if "messages" in value:
                    for msg in value["messages"]:
                        sender_phone = msg.get("from")
                        message_body = msg.get("text", {}).get("body", "")
                        
                        if message_body:
                            ai_result = classify_with_ai(message_body)
                            
                            category = ai_result.get("category", "General Complaint")
                            priority = ai_result.get("priority", "Medium")
                            summary = ai_result.get("summary", "NO summary provided")
                            
                            category = category if category in ALLOWED_CATEGORIES else "General Complaint"
                            priority = priority if priority in ALLOWED_PRIORITIES else "Medium"
                            
                            ticket_data = {
                                "company_id": "CMP001",
                                "branch_id": None,
                                "section_id": None,
                                "issue_type_id": None,
                                "message": message_body,
                                "category": category,
                                "priority": priority,
                                "summary": summary,
                                "status": "Open",   
                                "created_at": datetime.utcnow(),
                                "source": "whatsapp",
                                "sender_phone": sender_phone
                            }
                            
                            tickets_collection.insert_one(ticket_data)
                            
                            ack_message = f"Thanks for reaching out via WhatsApp! We have recorded your issue:\n\n*Summary:* {summary}\n*Priority:* {priority}\n\nOur team will review this shortly."
                            send_whatsapp_message(sender_phone, ack_message)
                            
        return {"status": "success"}

    return {"status": "ignored"}


frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "vf-ai-frontend", "frontend", "dist")
uploads_images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads", "images"))
os.makedirs(uploads_images_dir, exist_ok=True)
app.mount("/uploads/images", StaticFiles(directory=uploads_images_dir), name="uploads-images")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    print(f"Warning: Frontend build not found at {frontend_dist}. Please run 'npm run build' in the frontend directory.")

