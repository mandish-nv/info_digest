from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from transformers import LongT5ForConditionalGeneration, AutoTokenizer
from rouge_score import rouge_scorer
import torch

from nltk.tokenize import sent_tokenize
from nltk.tokenize import word_tokenize
import io
import os

from extractive_functions import Extractive_Summarizer
from helper_file_functions import get_file_extension, extract_text_from_docx, extract_text_from_pdf, capitalize_sentences

app = FastAPI()

# Global variables to store the loaded model and tokenizer
model = None
tokenizer = None
device = torch.device("cpu")

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
class SummarizerRequest(BaseModel):
    text: str
    ratio: float
    selectedOptionValue: str
    summaryType: str
    
@app.on_event("startup")
def load_model():
    """Load the model and tokenizer at application startup."""
    global model, tokenizer
    try:
        # Check if the model directory exists
        model_path = "./LongT5/longt5_best_model"
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model directory not found at {model_path}")
            
        model = LongT5ForConditionalGeneration.from_pretrained(model_path)
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        
        model.to(device)
        model.eval()
        print("Model and tokenizer loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        # Raise an HTTPException to stop the server if the model fails to load
        raise HTTPException(status_code=500, detail=f"Failed to load model: {e}")
    
# --- API Endpoints ---
@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI Python Backend!"}

@app.post("/api/extractive-summary")
async def api_extractive_summary(request: SummarizerRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required(FastAPi)")

    try:
        summaryType = request.summaryType
        
        if(summaryType=="abstractive"):
            # Check if the model is loaded before proceeding
            if model is None or tokenizer is None:
                return {"error": "Model not loaded. Please check server logs."}

            # Preprocess and generate
            input_text = "summarize: " + request.text
            inputs = tokenizer(input_text, return_tensors="pt", max_length=4096, truncation=True).to(device)

            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=256,
                min_length=30,
                length_penalty=2.0,
                repetition_penalty=1.2,
                num_beams=4,
                early_stopping=True
            )
            
            summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            
            summary_extractive, top_n_nouns_dict = Extractive_Summarizer(request.text, request.ratio, request.selectedOptionValue)
        else:
            summary, top_n_nouns_dict = Extractive_Summarizer(request.text, request.ratio, request.selectedOptionValue)
        
        summary = capitalize_sentences(summary)
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
    selectedOptionValue: str = Form(...,description="selectedOptionValue"),
    summaryType: str = Form(...,description="selectedOptsummaryTypeionValue")
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
        if(summaryType=="abstractive"):
            # Check if the model is loaded before proceeding
            if model is None or tokenizer is None:
                return {"error": "Model not loaded. Please check server logs."}

            # Preprocess and generate
            input_text = "summarize: " + raw_text
            inputs = tokenizer(input_text, return_tensors="pt", max_length=4096, truncation=True).to(device)

            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=256,
                min_length=30,
                length_penalty=2.0,
                repetition_penalty=1.2,
                num_beams=4,
                early_stopping=True
            )
            
            summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            
            summary_extractive, top_n_nouns_dict = Extractive_Summarizer(raw_text, ratio, selectedOptionValue)
        else:
            summary, top_n_nouns_dict = Extractive_Summarizer(raw_text, ratio, selectedOptionValue)
        
        summary = capitalize_sentences(summary)
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