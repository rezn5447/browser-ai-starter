from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai
import os

app = FastAPI()

# Senior Principle: Never hardcode keys. Use Environment Variables.
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

class PromptRequest(BaseModel):
    prompt: str

@app.post("/api/fallback")
async def fallback(request: PromptRequest):
    # This runs only if the client's local window.ai fails
    response = model.generate_content(request.prompt)
    return {"text": response.text}