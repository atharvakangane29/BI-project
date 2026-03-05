# Data Copilot: AI-Powered Power BI Assistant

This project is an intelligent "Data Copilot" that embeds a Power BI dashboard into a React web application. It allows users to interact with their data using natural language, translating chat prompts into real-time Power BI filters using OpenAI's GPT-4o.

## How it Works

1. **React Frontend**: Provides a side-by-side view with the Power BI dashboard on the left and a chat interface on the right.
2. **FastAPI Backend**: Receives natural language from the frontend and uses OpenAI to generate a Power BI-compatible JSON filter.
3. **Dynamic Filtering**: The frontend applies the AI-generated filter directly to the Power BI visuals or slicers in real-time.

---

## 🛠 Prerequisites

* **Node.js**: Installed on your machine.
* **Python 3.9+**: Installed on your machine.
* **OpenAI API Key**: To power the natural language translation.
* **Power BI Report**: Access to a report in the Power BI Service.

---

##  Setup & Installation

### 1. Backend Setup (Python)

Navigate to the `backend` folder:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

```

Create a `.env` file in the `backend` folder:

```env
OPENAI_API_KEY=your_openai_api_key_here

```

### 2. Frontend Setup (React)

Navigate to the `frontend` folder:

```bash
cd frontend
npm install

```

Create a `.env` file in the `frontend` folder:

```env
VITE_BACKEND_URL=http://localhost:8000

```

---

##  Running the Application (The "Hacky" Testing Approach)

This approach bypasses complex Azure App Registration by using your personal browser session token.

### Step 1: Get your AAD Token

1. Open your Power BI report in a web browser.
2. Press **F12** to open Developer Tools and go to the **Console** tab.
3. Type `powerBIAccessToken` and press **Enter**.
4. Copy the long string (the token) without the quotes.

### Step 2: Configure the Frontend

In `frontend/src/DashboardChat.jsx`, locate the `useEffect` hook and update the following variables with your specific report details and the token you just copied:

* `myReportId`: Found in the Power BI URL.
* `myEmbedUrl`: `https://app.powerbi.com/reportEmbed?reportId=YOUR_REPORT_ID`
* `myAadToken`: Paste the token from Step 1.

### Step 3: Start the Backend

```bash
cd backend
uvicorn main:app --reload

```

### Step 4: Start the Frontend

```bash
cd frontend
npm run dev

```

Open `http://localhost:5173` in your browser.

---

## Project Structure

* **`/backend`**: FastAPI server handling OpenAI integration and filter generation.
* **`/frontend`**: React application using `powerbi-client-react` for dashboard embedding.
* **`.gitignore`**: Configured to ignore `node_modules`, `venv`, and `.env` files to keep the repository clean.

##  Important Notes

* **Token Expiry**: The "Hacky" AAD token usually expires in 1 hour. If the dashboard stops loading, refresh the token from the Power BI Service console.
* **Data Model**: Ensure the `system_prompt` in `backend/main.py` matches your actual Power BI table and column names exactly.

