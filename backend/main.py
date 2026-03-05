from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import msal
import requests
from openai import OpenAI
import json
import os
from dotenv import load_dotenv

# Load variables from the .env file
load_dotenv()

app = FastAPI()

# --- CORS Configuration ---
# This allows your Vite React app (running on port 5173) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI Client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- Power BI Configuration ---
TENANT_ID = os.getenv("TENANT_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
WORKSPACE_ID = os.getenv("WORKSPACE_ID")
REPORT_ID = os.getenv("REPORT_ID")
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPE = ["https://analysis.windows.net/powerbi/api/.default"]

class ChatRequest(BaseModel):
    message: str

@app.get("/get-embed-token")
def get_embed_token():
    msal_app = msal.ConfidentialClientApplication(
        CLIENT_ID, authority=AUTHORITY, client_credential=CLIENT_SECRET
    )
    result = msal_app.acquire_token_for_client(scopes=SCOPE)
    
    if "access_token" not in result:
        raise HTTPException(status_code=401, detail="Failed to authenticate with Power BI")
    
    access_token = result["access_token"]
    
    embed_url = f"https://api.powerbi.com/v1.0/myorg/groups/{WORKSPACE_ID}/reports/{REPORT_ID}/GenerateToken"
    headers = {"Authorization": f"Bearer {access_token}"}
    payload = {"accessLevel": "View"}
    
    response = requests.post(embed_url, headers=headers, json=payload)
    token_data = response.json()
    
    report_url = f"https://app.powerbi.com/reportEmbed?reportId={REPORT_ID}&groupId={WORKSPACE_ID}"
    
    return {
        "embedToken": token_data.get("token"), 
        "embedUrl": report_url, 
        "reportId": REPORT_ID
    }

@app.post("/chat-to-filter")
def chat_to_filter(req: ChatRequest):
    system_prompt = """
You are an AI assistant controlling a Power BI dashboard.

The dashboard contains patent and exclusivity data.
Main table: 'Orange Book patent'
Available columns:
- 'Appl_Type'
- 'Appl_No'
- 'Product_No'
- 'Patent_No'
- 'Patent_Expire_Date_Text' (Visual format is "14 March 2001", "24 August 2026")
- 'Drug_Substance_Flag'
- 'Drug_Product_Flag'
- 'Patent_Use_Code'
- 'Delist_Flag'
- 'Submission_Date'

Your job is to convert the user's natural language request into a valid Power BI Filter JSON array.

You MUST use ONE of these two schemas depending on the request:

1. Basic Filter (For exact matches, e.g., a specific Appl_Type or an exact date):
[
  {
    "$schema": "http://powerbi.com/product/schema#basic",
    "target": { "table": "Orange Book patent", "column": "ColumnName" },
    "operator": "In",
    "values": ["Value1"]
  }
]

2. Advanced Filter (For date ranges, "before", "after", "till", or specific years):
[
  {
    "$schema": "http://powerbi.com/product/schema#advanced",
    "target": { "table": "Orange Book patent", "column": "ColumnName" },
    "logicalOperator": "And",
    "conditions": [
      {
        "operator": "LessThanOrEqual",
        "value": "2029-12-31T23:59:59.000Z"
      }
    ]
  }
]
Valid Advanced operators: "LessThan", "LessThanOrEqual", "GreaterThan", "GreaterThanOrEqual", "Contains", "StartsWith", "EndsWith".

Rules for Dates ('Patent_Expire_Date_Text'):
- If the user asks for an EXACT date (e.g., "on 14 March 2001"), use a Basic Filter and format the value exactly as "14 March 2001".
- If the user asks for a range (e.g., "till 2029" or "before 2029"), use an Advanced Filter with operator "LessThanOrEqual". 
- IMPORTANT: For Advanced Filter ranges, you MUST output the 'value' as a standard ISO date string (e.g., "2029-12-31T23:59:59.000Z"). Do not use the "14 March 2001" format for ranges.

Rules:
- Return ONLY a valid JSON array.
- Do NOT include markdown formatting, comments, or explanations.
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.message}
            ],
            temperature=0
        )
        
        # 1. Get the raw text
        raw_content = response.choices[0].message.content.strip()
        
        # 2. SAFETY CHECK: Strip markdown code blocks if the LLM added them
        if raw_content.startswith("```json"):
            raw_content = raw_content[7:-3].strip()
        elif raw_content.startswith("```"):
            raw_content = raw_content[3:-3].strip()
            
        print("AI Generated String:", raw_content)  # Debugging log
        
        # 3. Load the cleaned string into JSON
        filter_json = json.loads(raw_content)
        return {"filters": filter_json}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"LLM did not return valid JSON. It returned: {raw_content}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))