# python-api/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional

# Import your functions from the separate file
from my_functions import greet, calculate_sum, process_text_for_sentiment, Extractive_Summarizer

app = FastAPI()

# --- CORS Configuration ---
# This is crucial for allowing your React frontend to communicate with FastAPI.
# In production, specify exact origins instead of "*".
origins = [
    "http://localhost:5173",  # React frontend's default port
    # Add other origins if your React app is deployed elsewhere
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# --- Pydantic Models for Request/Response Validation ---
class GreetingRequest(BaseModel):
    name: str

class CalculationRequest(BaseModel):
    num1: int
    num2: int

class SentimentRequest(BaseModel):
    text: str
    
class ExtractiveSummarizerRequest(BaseModel):
    text: str

# --- API Endpoints ---

@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI Python Backend!"}

@app.post("/api/extractive-summary")
async def api_extractive_summary(request: ExtractiveSummarizerRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required(FastAPi)")

    try:
        result = Extractive_Summarizer(request.text)
        return {
            "summary": result,
            "original_length_sentences": len(request.text.split(".")),  # or however you count
            "summary_sentences_count": len(result.split("."))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in summarizing: {str(e)}")



@app.post("/api/greet")
async def api_greet(request: GreetingRequest):
    """Exposes the 'greet' function."""
    try:
        result = greet(request.name)
        return {"message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in greeting: {str(e)}")

@app.post("/api/calculate-sum")
async def api_calculate_sum(request: CalculationRequest):
    """Exposes the 'calculate_sum' function."""
    try:
        result = calculate_sum(request.num1, request.num2)
        return {"sum": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in calculation: {str(e)}")

@app.post("/api/analyze-sentiment")
async def api_analyze_sentiment(request: SentimentRequest):
    """Exposes the 'process_text_for_sentiment' function."""
    try:
        result = process_text_for_sentiment(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in sentiment analysis: {str(e)}")

# You can optionally run the app directly from this file for testing
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) # Run on a different port than Node.js