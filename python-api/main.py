# python-api/main.py

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from typing import Optional, Dict, List
from nltk.tokenize import sent_tokenize
from nltk.tokenize import word_tokenize
import os
import io
import docx # For .docx files
from PyPDF2 import PdfReader # For .pdf files (PyPDF2)

from my_functions import Extractive_Summarizer

app = FastAPI()

# --- CORS Configuration ---
origins = [
    "http://localhost:5173",# React frontend's default port
    "http://localhost:3000"
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
        original_length_sentences = len(sent_tokenize(request.text))
        summary_length_sentences = len(sent_tokenize(summary))    
        originalWordCount = len([token for token in word_tokenize(request.text) if token.isalnum()])
        summaryWordCount = len([token for token in word_tokenize(summary) if token.isalnum()])
        return {
            "summary": summary,
            "originalContentText": request.text,
            "original_length_sentences": original_length_sentences, 
            "summary_sentences_count": summary_length_sentences,
            "keywords": keywords_list,
            "originalWordCount": originalWordCount,
            "summaryWordCount": summaryWordCount
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in summarizing: {str(e)}")

# --- Allowed File Types for Server-Side Validation ---
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx'}
ALLOWED_MIME_TYPES = {
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

# --- Helper Functions for File Processing ---
def get_file_extension(filename: str) -> str:
    """Extracts the file extension from a filename."""
    return filename.split('.')[-1].lower()

def extract_text_from_docx(file_stream: io.BytesIO) -> str:
    """Extracts text from a .docx file."""
    try:
        document = docx.Document(file_stream)
        full_text = []
        for para in document.paragraphs:
            full_text.append(para.text)
        return "\n".join(full_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not process DOCX file: {e}. Ensure it's a valid .docx format."
        )

def extract_text_from_pdf(file_stream: io.BytesIO) -> str:
    """Extracts text from a .pdf file using PyPDF2."""
    try:
        reader = PdfReader(file_stream)
        full_text = []
        for page in reader.pages:
            # PyPDF2's extract_text() might return None or empty string for some pages
            # Ensure we only append actual text
            page_text = page.extract_text()
            if page_text:
                full_text.append(page_text)
        return "\n".join(full_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not process PDF file: {e}. Ensure it's a valid .pdf format."
        )
        
@app.post("/api/extractive-summary-file")
async def api_extractive_summary_file(
    file: UploadFile = File(..., description="The document file (.txt, .pdf, .docx) to summarize."),
    # 'ratio' is a form field. FastAPI uses Pydantic's Field for validation here.
    ratio: float = Form(..., ge=0.1, le=1.0, description="The summarization ratio (0.1 to 1.0).")
):
    """
    Receives a document file and a ratio, performs server-side validation,
    extracts text, and returns a summary.
    """
    # 1. Server-side File Type Validation
    file_extension = get_file_extension(file.filename)
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension: .{file_extension}. Only .txt, .pdf, and .docx are allowed."
        )

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type: {file.content_type}. Only text/plain, application/pdf, and DOCX types are allowed."
        )

    # 2. Read File Content and Extract Text
    raw_text = ""
    try:
        contents = await file.read() # Read file contents as bytes
        file_stream = io.BytesIO(contents) # Create a BytesIO stream for parsing libraries

        if file_extension == 'txt':
            try:
                raw_text = contents.decode('utf-8') # Decode bytes to string for text files
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Could not decode text file with UTF-8. Please ensure it's a valid text file."
                )
        elif file_extension == 'docx':
            raw_text = extract_text_from_docx(file_stream)
        elif file_extension == 'pdf':
            raw_text = extract_text_from_pdf(file_stream)

    except HTTPException: # Re-raise HTTPExceptions from helper functions
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read or process file content: {e}"
        )
    finally:
        await file.close() # Ensure the uploaded file is closed after reading

    # 3. Summarization Logic
    if not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Extracted text is empty or contains only whitespace. Cannot summarize an empty document."
        )

    try:
        # Call your actual summarization function with the extracted text and parsed ratio
        summary, top_n_nouns_dict = Extractive_Summarizer(raw_text, ratio)
        
        # Prepare response data
        keywords_list = list(top_n_nouns_dict.keys())
        original_length_sentences = len(sent_tokenize(raw_text))
        summary_length_sentences = len(sent_tokenize(summary))
        originalWordCount = len([token for token in word_tokenize(raw_text) if token.isalnum()])
        summaryWordCount = len([token for token in word_tokenize(summary) if token.isalnum()])

        return {
            "summary": summary,
            "originalContentText": raw_text,
            "original_filename": file.filename, # Include original filename in response
            "processed_ratio": ratio,
            "original_length_sentences": original_length_sentences,
            "summary_sentences_count": summary_length_sentences,
            "keywords": keywords_list,
            "originalWordCount": originalWordCount,
            "summaryWordCount": summaryWordCount,
            "message": "File processed and summarized successfully."
        }
    except Exception as e:
        # Catch any errors that occur during the summarization process itself
        print(f"Error during summarization: {e}") # Log the error for debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during summarization: {str(e)}"
        )

# You can optionally run the app directly from this file for testing
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) # Run on a different port than Node.js