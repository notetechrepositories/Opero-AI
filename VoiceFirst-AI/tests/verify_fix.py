
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

try:
    from app.services.ai_service import classify_with_ai
    print("Successfully imported classify_with_ai")
except ImportError as e:
    print(f"Failed to import classify_with_ai: {e}")
    sys.exit(1)

# Mock requests to avoid actual API call if we just want to test import and basic logic structure
# But for now, let's just test import since that was the initial error. 
# The user's original error was "Could not find import of requests".
# So if we can import it, that's step 1.
# Step 2 is the JSON parsing. We can try to mock the response.

import unittest
from unittest.mock import patch, MagicMock

class TestAIService(unittest.TestCase):
    @patch('app.services.ai_service.requests.post')
    def test_classify_with_ai_returns_dict(self, mock_post):
        # Mock response
        mock_response = MagicMock()
        # Return a valid JSON string inside the response structure Ollama uses
        mock_response.json.return_value = {
            "response": '{"category": "Technical", "priority": "High", "summary": "Issue with login"}'
        }
        mock_post.return_value = mock_response

        from app.services.ai_service import classify_with_ai
        result = classify_with_ai("I can't login")
        
        print(f"Result type: {type(result)}")
        print(f"Result value: {result}")
        
        if isinstance(result, dict):
            print("SUCCESS: Result is a dictionary")
        else:
            print("FAILURE: Result is not a dictionary")
            sys.exit(1)

if __name__ == '__main__':
    unittest.main()
