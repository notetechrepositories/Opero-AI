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
    fallback = {"issue": "Unknown", "category": "Other", "priority": "Low"}

    prompt = f"""
You are an IT issue classification system.

Analyze the provided image and identify the main IT issue shown.

Return ONLY valid JSON and ONLY that JSON (no extra text), with this exact schema:
{{
  "issue": "<short issue title in simple words, 1-6 words>",
  "category": "<one of: {', '.join(allowed_categories)}>",
  "priority": "<one of: {', '.join(allowed_priorities)}>"
}}

Rules:
- "issue" must be a short title (no newlines).
- If the image clearly shows a laptop with a broken/cracked screen, set issue to EXACTLY: "laptop broken screen".
- If any specific device is visible (laptop, printer, monitor, phone), include the device name in the issue when possible.
- category and priority must match the allowed values exactly.
- Do NOT include any instruction text inside the values.
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
            return ("instruction" in ss) or ("do not" in ss) or ("short issue title" in ss) or ("one-6 words" in ss) or ("only valid json" in ss) or ("rules:" in ss)

        # Used only when the model echoes instructions into `issue`.

        # Map common words from the raw model output into a safe issue keyword.
        # Used only for prompt-echo cleanup.
        keyword_map = [
            ("laptop", "laptop"),
            ("screen", "broken screen"),
            ("cracked", "broken"),
            ("broken", "broken"),
            ("damage", "broken"),
            ("damaged", "broken"),
            ("wifi", "wifi"),
            ("internet", "wifi"),
            ("printer", "printer"),
            ("keyboard", "keyboard"),
            ("mouse", "mouse"),
            ("leak", "leak"),
            ("water", "leak"),
            ("burst", "leak"),
            ("smell", "smell"),
            ("dirty", "dirty"),
            ("stain", "stain"),
            ("delay", "delay"),
            ("waiting", "delay"),
        ]

        def _clean_issue(text: str, raw_response_text: str) -> str:
            cleaned = _normalize_spaces(text)
            lowered_clean = (cleaned or "").lower()
            if "laptop" in lowered_clean and ("screen" in lowered_clean or "display" in lowered_clean):
                return "laptop broken screen"
            if not cleaned or _looks_like_prompt_echo(cleaned):
                raw_l = (raw_response_text or "").lower()
                if "laptop" in raw_l and ("screen" in raw_l or "display" in raw_l):
                    return "laptop broken screen"
                for k, v in keyword_map:
                    if k in raw_l:
                        return v
                return fallback["issue"]

            # Remove trailing punctuation except a single period.
            cleaned = cleaned.replace("..", ".").strip()
            words = cleaned.split()
            if len(words) > 6:
                cleaned = " ".join(words[:6]).strip()
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

