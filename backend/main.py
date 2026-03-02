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
    The dashboard has a table called 'Sales' with columns: 'Region', 'ProductCategory', and 'Status'.
    Convert the user's natural language request into a valid Power BI Basic Filter JSON array.
    
    Power BI Basic Filter Schema:
    [
      {
        "$schema": "http://powerbi.com/product/schema#basic",
        "target": { "table": "TableName", "column": "ColumnName" },
        "operator": "In",
        "values": ["Value1", "Value2"]
      }
    ]
    
    Return ONLY valid JSON. Do not include markdown formatting or explanations.
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
        filter_json = json.loads(response.choices[0].message.content)
        return {"filters": filter_json}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM did not return valid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))