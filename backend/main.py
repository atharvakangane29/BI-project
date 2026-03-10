import os
import json
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from typing import List, Optional

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI()

AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
AZURE_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID")
POWERBI_WORKSPACE_ID = os.getenv("POWERBI_WORKSPACE_ID")
POWERBI_REPORT_ID = os.getenv("POWERBI_REPORT_ID")
POWERBI_DATASET_ID = os.getenv("POWERBI_DATASET_ID")
POWERBI_API_URL = os.getenv("POWERBI_API_URL", "https://api.powerbi.com/v1.0/myorg")
POWERBI_SCOPE = os.getenv("POWERBI_SCOPE", "https://analysis.windows.net/powerbi/api/.default")


def get_powerbi_access_token():
    url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": AZURE_CLIENT_ID,
        "client_secret": AZURE_CLIENT_SECRET,
        "scope": POWERBI_SCOPE,
    }
    resp = requests.post(url, data=payload)
    if not resp.ok:
        raise Exception(f"Azure token error {resp.status_code}: {resp.text}")
    return resp.json()["access_token"]


@app.get("/get-embed-token")
def get_embed_token():
    try:
        access_token = get_powerbi_access_token()
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

        # Generate embed token for report
        url = f"{POWERBI_API_URL}/groups/{POWERBI_WORKSPACE_ID}/reports/{POWERBI_REPORT_ID}/GenerateToken"
        payload = {"accessLevel": "view"}
        resp = requests.post(url, headers=headers, json=payload)
        if not resp.ok:
            raise Exception(f"GenerateToken error {resp.status_code}: {resp.text}")
        data = resp.json()

        report_url = f"{POWERBI_API_URL}/groups/{POWERBI_WORKSPACE_ID}/reports/{POWERBI_REPORT_ID}"
        report_resp = requests.get(report_url, headers=headers)
        if not report_resp.ok:
            raise Exception(f"GetReport error {report_resp.status_code}: {report_resp.text}")
        report_data = report_resp.json()

        return {
            "token": data["token"],
            "tokenId": data["tokenId"],
            "expiration": data["expiration"],
            "embedUrl": report_data["embedUrl"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get embed token: {str(e)}")


@app.get("/get-schema")
def get_schema():
    """Fetch dataset tables and columns from Power BI REST API."""
    try:
        access_token = get_powerbi_access_token()
        headers = {"Authorization": f"Bearer {access_token}"}

        tables_url = f"{POWERBI_API_URL}/groups/{POWERBI_WORKSPACE_ID}/datasets/{POWERBI_DATASET_ID}/tables"
        resp = requests.get(tables_url, headers=headers)
        if not resp.ok:
            raise Exception(f"GetTables error {resp.status_code}: {resp.text}")
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schema: {str(e)}")


class DaxRequest(BaseModel):
    query: str


@app.post("/execute-dax")
def execute_dax(req: DaxRequest):
    """Execute a DAX query against the Power BI dataset."""
    try:
        access_token = get_powerbi_access_token()
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

        url = f"{POWERBI_API_URL}/groups/{POWERBI_WORKSPACE_ID}/datasets/{POWERBI_DATASET_ID}/executeQueries"
        payload = {"queries": [{"query": req.query}], "serializerSettings": {"includeNulls": True}}

        resp = requests.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DAX query failed: {str(e)}")


class ChatRequest(BaseModel):
    message: str
    schema_tables: Optional[List[dict]] = []
    dax_result: Optional[str] = None


@app.post("/chat")
def chat_agent(req: ChatRequest):
    schema_string = json.dumps(req.schema_tables, indent=2) if req.schema_tables else "Unknown"

    system_prompt = f"""
You are an AI data assistant controlling a Power BI dashboard.

You have access to the following dataset schema (tables, columns, measures):
{schema_string}

Your task is to analyze the user's request and respond in EXACTLY this JSON format:
{{
  "status": "success" | "error",
  "query_type": "filtered_query" | "data_query" | "unsupported",
  "message": "Error message if status is error",
  "filters": [
    {{ "table": "TableName", "column": "ColumnName", "operator": "In", "values": ["Value1"] }}
  ],
  "dax_query": "EVALUATE ... (only if data needs to be fetched)",
  "needs_dax": true | false,
  "insight": "Conversational answer to the user's question"
}}

RULES:
1. ONLY use tables and columns that exist in the schema above. NEVER invent fields.
2. If the user asks for something that cannot be answered from the schema, set status="error" and query_type="unsupported".
3. If the user implies a filter (e.g., "in 2024", "for Facility A"), populate the "filters" array with Power BI compatible filter objects.
4. If the user asks a data question (e.g., "which facility has highest encounters?"), set "needs_dax": true and write the DAX query.
5. If dax_result data is provided, use it to generate a clear "insight". Do NOT set needs_dax again.
6. For filter-only queries (e.g., "show data for 2024"), set needs_dax=false and provide a brief insight like "Filters applied for 2024."
7. Operator options: "In", "LessThan", "LessThanOrEqual", "GreaterThan", "GreaterThanOrEqual", "Contains", "StartsWith"
"""

    user_content = req.message
    if req.dax_result:
        user_content += f"\n\nHere is the DAX query result to answer the question:\n{req.dax_result}"

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0,
        )

        raw_content = response.choices[0].message.content.strip()
        if raw_content.startswith("```json"):
            raw_content = raw_content[7:-3].strip()
        elif raw_content.startswith("```"):
            raw_content = raw_content[3:-3].strip()

        print("AI Output:", raw_content)
        return json.loads(raw_content)

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM did not return valid JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))