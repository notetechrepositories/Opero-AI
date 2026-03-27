import requests
import json
import re

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3"

# Vision model used for image analysis via Ollama.
IMAGE_ANALYSIS_MODEL = "llava"


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


def analyze_image_with_llava(image_base64: str):
    """
    Analyze an image using LLaVA via Ollama.

    Returns:
      {"issue": "<issue title>", "category": "<allowed category>", "priority": "<allowed priority>"}
    """
    allowed_categories = [
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
    allowed_priorities = ["High", "Medium", "Low"]
    fallback = {"issue": "An issue was detected and requires attention from the staff.", "category": "Other", "priority": "Low"}

    prompt = f"""
You are an AI assistant that analyzes images and describes problems clearly for employees and managers.

Your goal is to identify the issue in the image and explain it in a simple, professional, and actionable way.

----------------------------------------
INSTRUCTIONS:
- Look at the image carefully
- Identify the main problem
- Describe it in ONE clear sentence

----------------------------------------
RULES:
- Write ONLY one sentence
- Use simple and professional English
- Keep it short (10-18 words)
- Clearly explain what is wrong
- Mention the object (table, plate, floor, machine, laptop, etc.)
- Make it actionable (so staff knows what to fix)

----------------------------------------
IMPORTANT:
- Do NOT use short phrases like "Dirty plates"
- Do NOT use technical or complex words
- Do NOT write multiple sentences
- Do NOT include any explanation outside JSON

----------------------------------------
EXAMPLES:
GOOD:
- "The table is messy with leftover food and unclean plates."
- "The floor is wet and needs to be cleaned to avoid accidents."
- "The laptop screen is broken and not working properly."
- "The room is dirty and requires immediate cleaning."

BAD:
- "Dirty plates"
- "Cleanliness issue detected"
- "Problem observed in the image"

----------------------------------------
CATEGORIES (choose EXACTLY one):
{', '.join(allowed_categories)}

----------------------------------------
PRIORITY RULES:
- High: hygiene issues, safety risks, or serious problems
- Medium: operational or service issues
- Low: minor issues or suggestions

----------------------------------------
OUTPUT FORMAT (RETURN ONLY JSON, no extra text):
{{
  "issue": "<one clear sentence, 10-18 words>",
  "category": "<one category from the list above>",
  "priority": "<High | Medium | Low>"
}}
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": IMAGE_ANALYSIS_MODEL,
                "prompt": prompt,
                "images": [image_base64],
                "stream": False,
            },
        )
        response.raise_for_status()

        payload = response.json() if response.content else {}
        raw_response = str(payload.get("response") or payload.get("message") or "").strip()
        print(f"Image Analysis Raw Response: {raw_response}")

        def _normalize_spaces(s: str) -> str:
            return " ".join((s or "").replace("\r", " ").replace("\n", " ").replace("\t", " ").split()).strip()

        def _looks_like_prompt_echo(s: str) -> bool:
            ss = (s or "").lower()
            echo_markers = [
                "instruction", "do not", "short issue title", "only valid json",
                "rules:", "output format", "return only", "one clear sentence",
                "choose exactly", "10-18 words", "examples:", "good:", "bad:",
            ]
            return any(m in ss for m in echo_markers)

        # Fallback sentence map — used only when the model fails to produce a sentence.
        keyword_map = [
            ("laptop",   "The laptop screen is broken and not working properly."),
            ("screen",   "The screen is cracked and needs to be replaced immediately."),
            ("cracked",  "The screen is cracked and needs to be replaced immediately."),
            ("broken",   "The device is broken and requires immediate repair."),
            ("damage",   "The equipment is damaged and needs to be fixed."),
            ("wifi",     "The Wi-Fi connection is not working and needs to be restored."),
            ("internet", "The internet connection is down and needs to be restored."),
            ("printer",  "The printer is not working and needs to be repaired."),
            ("keyboard", "The keyboard is not responding and needs to be replaced."),
            ("mouse",    "The mouse is not working and needs to be checked."),
            ("leak",     "The pipe is leaking and needs to be repaired immediately."),
            ("water",    "There is a water leak that needs to be fixed immediately."),
            ("dirty",    "The area is dirty and requires immediate cleaning by staff."),
            ("stain",    "There is a visible stain that needs to be cleaned right away."),
            ("floor",    "The floor is dirty and needs to be cleaned to avoid accidents."),
            ("table",    "The table is messy and needs to be cleaned by staff."),
            ("delay",    "There is a service delay that needs to be addressed quickly."),
            ("waiting",  "Customers are waiting too long and the service needs improvement."),
            ("smell",    "There is an unpleasant smell that needs to be investigated."),
            ("food",     "The food quality is poor and needs to be checked by management."),
        ]

        def _clean_issue(text: str, raw_response_text: str) -> str:
            cleaned = _normalize_spaces(text)

            if not cleaned or _looks_like_prompt_echo(cleaned):
                raw_l = (raw_response_text or "").lower()
                for k, v in keyword_map:
                    if k in raw_l:
                        return v
                return fallback["issue"]

            # Ensure it ends with a period.
            cleaned = cleaned.replace("..", ".").strip()
            if cleaned and cleaned[-1] not in ".!?":
                cleaned += "."

            # Accept sentences in the 8–25 word range (slight buffer around 10–18).
            words = cleaned.split()
            if len(words) < 5:
                # Too short — try to find a keyword fallback from the raw response.
                raw_l = (raw_response_text or "").lower()
                for k, v in keyword_map:
                    if k in raw_l:
                        return v
                return fallback["issue"]
            if len(words) > 25:
                # Trim to 20 words and re-add period.
                cleaned = " ".join(words[:20]).rstrip(".,!?") + "."

            return cleaned

        def _normalize_for_match(value: str) -> str:
            value = (value or "").strip().lower()
            value = re.sub(r"\s*/\s*", "/", value)
            value = re.sub(r"\s+", " ", value)
            return value

        def _match_allowed(value: str, allowed: list, fallback_value: str) -> str:
            candidate = _normalize_for_match(value)
            for a in allowed:
                if _normalize_for_match(a) == candidate:
                    return a
            return fallback_value

        def _try_parse_json_block(s: str):
            if not s:
                return None
            try:
                parsed = json.loads(s)
                return parsed if isinstance(parsed, dict) else None
            except json.JSONDecodeError:
                pass

            if "{" in s and "}" in s:
                start = s.find("{")
                end = s.rfind("}") + 1
                candidate = s[start:end]
                try:
                    parsed = json.loads(candidate)
                    return parsed if isinstance(parsed, dict) else None
                except json.JSONDecodeError:
                    return None
            return None

        parsed = _try_parse_json_block(raw_response)

        if not parsed:
            print(f"Image Analysis Final Result: {fallback}")
            return fallback

        lowered = {str(k).strip().lower(): v for k, v in parsed.items()}
        issue_val = lowered.get("issue", fallback["issue"])
        category_val = lowered.get("category", fallback["category"])
        priority_val = lowered.get("priority", fallback["priority"])

        result = {
            "issue": _clean_issue(str(issue_val), raw_response),
            "category": _match_allowed(str(category_val), allowed_categories, fallback["category"]),
            "priority": _match_allowed(str(priority_val), allowed_priorities, fallback["priority"]),
        }

        print(f"Image Analysis Final Result: {result}")
        return result

    except Exception as e:
        print(f"Image analysis error: {str(e)}")
        return {
            "issue": fallback["issue"],
            "category": fallback["category"],
            "priority": "Low",
            "error": str(e),
        }

