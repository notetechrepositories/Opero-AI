import sys
sys.path.append('c:\\Users\\Admin\\Desktop\\VF-AI\\VoiceFirst-AI')
from app.db.database import companies_collection
company = companies_collection.find_one()
if company:
    code = company.get('company_code', company.get('company_id'))
    print(f'Found company: {code}')
    from app.main import get_ai_insights
    try:
        res = get_ai_insights(code)
        import json
        print('Insights:', json.dumps(res, indent=2))
    except Exception as e:
        print('Error:', e)
else:
    print('No companies found.')
