import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3"


def classify_with_ai(message: str):
    prompt = f"""
    You are an AI complaint classification system.

    The system is used by hotels, restaurants, and clinics.

    Ticket Message:
    {message}

    Classify the complaint into one of these categories (choose strictly one):
    - Cleanliness
    - Food Quality
    - Service
    - Staff Behavior
    - Billing Issue
    - Delay / Waiting Time
    - Maintenance
    - Facilities
    - Appointment Issue
    - General Complaint
    - Feedback / Suggestion

    Priority rules:
    - High: Safety, hygiene, serious misconduct
    - Medium: Service issues, billing problems
    - Low: Suggestions or minor issues

    Return only valid JSON, do not include any additional text:
    {{
        "category": "<value>",
        "priority": "<value>",
        "summary": "<value>"
    }}

    """

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        }
    )

    result = response.json()["response"]
    
    try:
        result = json.loads(response.json()["response"])
    except json.JSONDecodeError:
        result = {"error": "Failed to parse AI response", "raw": response.json()["response"]}

    return result

def generate_insights(tickets_data: str):
    prompt = f"""
    You are an expert AI business analyst.
    Below is a JSON array of recent customer tickets for a company.

    Tickets:
    {tickets_data}

    Analyze these tickets and provide structured executive insights.
    Return only valid JSON, do not include any additional text:
    {{
        "theme_analysis": "<summary of common themes>",
        "critical_issues": ["<list of high priority issues>"],
        "operational_recommendations": ["<actionable recommendations>"]
    }}
    """

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False
        }
    )

    try:
        result = json.loads(response.json()["response"])
    except json.JSONDecodeError:
        result = {"error": "Failed to parse AI response", "raw": response.json()["response"]}
    except Exception as e:
        result = {"error": f"Error calling AI: {str(e)}"}

    return result

