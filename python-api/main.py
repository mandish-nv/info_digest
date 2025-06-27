# python-api/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional
from nltk.tokenize import sent_tokenize

# Import your functions from the separate file
from my_functions import Extractive_Summarizer

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
class ExtractiveSummarizerRequest(BaseModel):
    text: str
    ratio: float

# --- API Endpoints ---

@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI Python Backend!"}

@app.post("/api/extractive-summary")
async def api_extractive_summary(request: ExtractiveSummarizerRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required(FastAPi)")

    try:
        summary, top_n_nouns_dict = Extractive_Summarizer(request.text, request.ratio)
        keywords_list = list(top_n_nouns_dict.keys())
        # keywords_list = top_n_nouns_dict
        
        original_sentences = sent_tokenize(request.text)
        original_length_sentences = len(original_sentences)
        summary_sentences = sent_tokenize(summary)
        summary_length_sentences = len(summary_sentences)
        return {
            "summary": summary,
            "original_length_sentences": original_length_sentences, 
            "summary_sentences_count": summary_length_sentences,
            "keywords": keywords_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in summarizing: {str(e)}")


# You can optionally run the app directly from this file for testing
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) # Run on a different port than Node.js