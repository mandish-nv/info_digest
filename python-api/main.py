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
import re

from extractive_functions import Extractive_Summarizer
from helper_file_functions import get_file_extension, extract_text_from_docx, extract_text_from_pdf, capitalize_sentences, remove_redundant_sentences

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
        original_length_sentences = len(sent_tokenize(request.text))
        
        if summaryType == "abstractive":
            if model is None or tokenizer is None:
                raise HTTPException(status_code=500, detail="Model not loaded. Please check server logs.")
            
            summary_option = request.selectedOptionValue.lower().strip()
            num_of_sentences = 0

            # --- Tiered sentence selection logic ---
            if 1 <= original_length_sentences <= 20:
                if summary_option == "very_short":
                    num_of_sentences = min(2, original_length_sentences)
                    num_of_sentences = max(1, num_of_sentences)
                elif summary_option == "short":
                    num_of_sentences = min(4, original_length_sentences)
                    num_of_sentences = max(3, num_of_sentences)
                elif summary_option == "medium":
                    num_of_sentences = min(7, original_length_sentences)
                    num_of_sentences = max(5, num_of_sentences)
                elif summary_option == "long":
                    percentage_based = int(original_length_sentences * 0.5)
                    num_of_sentences = min(max(10, percentage_based), original_length_sentences)
                    num_of_sentences = max(8, num_of_sentences)

            elif 21 <= original_length_sentences <= 100:
                if summary_option == "very_short":
                    num_of_sentences = min(3, original_length_sentences)
                elif summary_option == "short":
                    num_of_sentences = max(5, int(original_length_sentences * 0.08))
                elif summary_option == "medium":
                    num_of_sentences = max(8, int(original_length_sentences * 0.15))
                elif summary_option == "long":
                    num_of_sentences = max(15, int(original_length_sentences * 0.25))

            elif 101 <= original_length_sentences <= 500:
                if summary_option == "very_short":
                    num_of_sentences = min(5, original_length_sentences)
                elif summary_option == "short":
                    num_of_sentences = int(original_length_sentences * 0.08)
                elif summary_option == "medium":
                    num_of_sentences = int(original_length_sentences * 0.15)
                elif summary_option == "long":
                    num_of_sentences = int(original_length_sentences * 0.25)

            elif original_length_sentences > 500:
                if summary_option == "very_short":
                    num_of_sentences = min(7, original_length_sentences)
                elif summary_option == "short":
                    num_of_sentences = int(original_length_sentences * 0.05)
                elif summary_option == "medium":
                    num_of_sentences = int(original_length_sentences * 0.10)
                elif summary_option == "long":
                    num_of_sentences = min(int(original_length_sentences * 0.18), 150)

            if num_of_sentences == 0 and original_length_sentences > 0:
                num_of_sentences = 1

            num_of_sentences = min(num_of_sentences, original_length_sentences)

            # ~30 tokens per sentence; cap long outputs at 600 tokens
            max_length_by_sentences = min(num_of_sentences * 30, 600)

            # ~8 tokens per sentence for min length (lighter constraint than before)
            min_length_by_sentences = max(5, int(num_of_sentences * 8))

            clean_text = re.sub(r"\[\d+(?:[;,]?\s*\d+)*\]", "", request.text)

            input_text = "summarize: " + clean_text
            inputs = tokenizer(input_text, return_tensors="pt", max_length=4096, truncation=True).to(device)

            # --- Generation ---
            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=max_length_by_sentences,
                min_length=min_length_by_sentences,
                length_penalty=1.4 if summary_option == "very_short" else 1.8, 
                repetition_penalty=2.5,  
                no_repeat_ngram_size=4,  
                num_beams=2,            
                early_stopping=True
            )

            summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            summary = remove_redundant_sentences(summary)

            summary_extractive, top_n_nouns_dict = Extractive_Summarizer(request.text, request.ratio, request.selectedOptionValue)
        else:
            summary, top_n_nouns_dict = Extractive_Summarizer(request.text, request.ratio, request.selectedOptionValue)
        
        summary = capitalize_sentences(summary)
        keywords_list = list(top_n_nouns_dict.keys())
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
        text = raw_text
        original_length_sentences = len(sent_tokenize(raw_text))
        
        if summaryType == "abstractive":
            if model is None or tokenizer is None:
                raise HTTPException(status_code=500, detail="Model not loaded. Please check server logs.")
            
            # --- Tiered sentence logic based on document length ---
            summary_option = selectedOptionValue.lower().strip()
            num_of_sentences = 0

            # --- Tiered sentence selection logic ---
            if 1 <= original_length_sentences <= 20:
                if summary_option == "very_short":
                    num_of_sentences = min(2, original_length_sentences)
                    num_of_sentences = max(1, num_of_sentences)
                elif summary_option == "short":
                    num_of_sentences = min(4, original_length_sentences)
                    num_of_sentences = max(3, num_of_sentences)
                elif summary_option == "medium":
                    num_of_sentences = min(7, original_length_sentences)
                    num_of_sentences = max(5, num_of_sentences)
                elif summary_option == "long":
                    percentage_based = int(original_length_sentences * 0.5)
                    num_of_sentences = min(max(10, percentage_based), original_length_sentences)
                    num_of_sentences = max(8, num_of_sentences)

            elif 21 <= original_length_sentences <= 100:
                if summary_option == "very_short":
                    num_of_sentences = min(3, original_length_sentences)
                elif summary_option == "short":
                    num_of_sentences = max(5, int(original_length_sentences * 0.08))
                elif summary_option == "medium":
                    num_of_sentences = max(8, int(original_length_sentences * 0.15))
                elif summary_option == "long":
                    num_of_sentences = max(15, int(original_length_sentences * 0.25))

            elif 101 <= original_length_sentences <= 500:
                if summary_option == "very_short":
                    num_of_sentences = min(5, original_length_sentences)
                elif summary_option == "short":
                    num_of_sentences = int(original_length_sentences * 0.08)
                elif summary_option == "medium":
                    num_of_sentences = int(original_length_sentences * 0.15)
                elif summary_option == "long":
                    num_of_sentences = int(original_length_sentences * 0.25)

            elif original_length_sentences > 500:
                if summary_option == "very_short":
                    num_of_sentences = min(7, original_length_sentences)
                elif summary_option == "short":
                    num_of_sentences = int(original_length_sentences * 0.05)
                elif summary_option == "medium":
                    num_of_sentences = int(original_length_sentences * 0.10)
                elif summary_option == "long":
                    num_of_sentences = min(int(original_length_sentences * 0.18), 150)

            if num_of_sentences == 0 and original_length_sentences > 0:
                num_of_sentences = 1

            num_of_sentences = min(num_of_sentences, original_length_sentences)

            # ~30 tokens per sentence; cap long outputs at 600 tokens
            max_length_by_sentences = min(num_of_sentences * 30, 600)

            # ~8 tokens per sentence for min length (lighter constraint than before)
            min_length_by_sentences = max(5, int(num_of_sentences * 8))

            clean_text = re.sub(r"\[\d+(?:[;,]?\s*\d+)*\]", "", text)

            input_text = "summarize: " + clean_text
            inputs = tokenizer(input_text, return_tensors="pt", max_length=4096, truncation=True).to(device)

            # --- Generation ---
            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=max_length_by_sentences,
                min_length=min_length_by_sentences,
                length_penalty=1.4 if summary_option == "very_short" else 1.8, 
                repetition_penalty=2.5,  
                no_repeat_ngram_size=4,  
                num_beams=2,            
                early_stopping=True
            )

            summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            summary = remove_redundant_sentences(summary)
            
            summary_extractive, top_n_nouns_dict = Extractive_Summarizer(raw_text, ratio, selectedOptionValue)
        else:
            summary, top_n_nouns_dict = Extractive_Summarizer(raw_text, ratio, selectedOptionValue)
        
        summary = capitalize_sentences(summary)
        keywords_list = list(top_n_nouns_dict.keys())
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