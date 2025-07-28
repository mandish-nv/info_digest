from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from nltk.tokenize import sent_tokenize
from nltk.tokenize import word_tokenize
import io

from extractive_functions import Extractive_Summarizer
from helper_file_functions import get_file_extension, extract_text_from_docx, extract_text_from_pdf

app = FastAPI()

# --- CORS Configuration ---
origins = [
    "http://localhost:5173", # React frontend port
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
    selectedOptionValue: str
    
# --- API Endpoints ---
@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI Python Backend!"}

@app.post("/api/extractive-summary")
async def api_extractive_summary(request: ExtractiveSummarizerRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required(FastAPi)")

    try:
        summary, top_n_nouns_dict = Extractive_Summarizer(request.text, request.ratio, request.selectedOptionValue)
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

@app.post("/api/extractive-summary-file")
async def api_extractive_summary_file(
    file: UploadFile = File(..., description="The document file (.txt, .pdf, .docx) to summarize."),
    ratio: float = Form(..., ge=0.01, le=1.0, description="The summarization ratio (0.01 to 1.0)."),
    selectedOptionValue: str = Form(...,description="selectedOptionValue")
):
    ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx'}
    ALLOWED_MIME_TYPES = {
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}
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
        summary, top_n_nouns_dict = Extractive_Summarizer(raw_text, ratio, selectedOptionValue)
        
        keywords_list = list(top_n_nouns_dict.keys())
        original_length_sentences = len(sent_tokenize(raw_text))
        summary_length_sentences = len(sent_tokenize(summary))
        originalWordCount = len([token for token in word_tokenize(raw_text) if token.isalnum()])
        summaryWordCount = len([token for token in word_tokenize(summary) if token.isalnum()])

        return {
            "summary": summary,
            "originalContentText": raw_text,
            "original_filename": file.filename, 
            "processed_ratio": ratio,
            "selectedOptionValue": selectedOptionValue,
            "original_length_sentences": original_length_sentences,
            "summary_sentences_count": summary_length_sentences,
            "keywords": keywords_list,
            "originalWordCount": originalWordCount,
            "summaryWordCount": summaryWordCount,
            "message": "File processed and summarized successfully."
        }
    except Exception as e:
        print(f"Error during summarization: {e}") 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during summarization: {str(e)}"
        )

# You can optionally run the app directly from this file for testing
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 