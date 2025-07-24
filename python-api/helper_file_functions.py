import io
import docx
from PyPDF2 import PdfReader # For .pdf files (PyPDF2)
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
import re

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
    """
    Extracts text from a .pdf file using PyPDF2 and applies post-processing
    to make it more suitable for text summarization models.
    """
    try:
        reader = PdfReader(file_stream)
        raw_pages_text = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                raw_pages_text.append(page_text)

        # Join pages first, then apply document-level post-processing
        full_raw_text = "\n".join(raw_pages_text)

        # Apply a series of post-processing steps
        processed_text = post_process_for_summarization(full_raw_text)

        return processed_text

    except Exception as e:
        # Log the full exception for debugging
        print(f"Error processing PDF for summarization: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not process PDF file: {e}. Ensure it's a valid .pdf format."
        )

def post_process_for_summarization(text: str) -> str:
    """
    Applies a series of robust post-processing steps to clean text,
    making it more coherent and suitable for NLP tasks like summarization.
    """
    # Step 1: Normalize line endings to consistent Unix-style
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Step 2: Aggressively remove common PDF extraction artifacts
    # Such as broken words, excessive spaces, and form feed characters.

    # Remove soft hyphens and line breaks that join words (e.g., "word-\ncontinuation")
    text = re.sub(r'-\s*\n\s*', '', text) # Finds hyphen, optional spaces, newline, optional spaces
    text = re.sub(r'\s*\n\s*', ' ', text) # Replace any newline with a single space (aggressive for flow)

    # Note: The above `\s*\n\s*` replacement makes text one continuous string.
    # If preserving paragraphs is crucial, a more nuanced approach is needed,
    # e.g., replacing single '\n' with a space and double '\n\n' with a paragraph break.
    # For summarization, a single continuous string often works better than fragmented lines.

    # Consolidate multiple spaces into single spaces
    text = re.sub(r'\s+', ' ', text)

    # Remove common header/footer numerical patterns or page numbers
    # This is highly dependent on your PDF's structure. Examples:
    text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE) # Lines containing only numbers
    text = re.sub(r'Page\s+\d+\s+of\s+\d+', '', text, flags=re.IGNORECASE) # "Page X of Y"

    # Remove form feed characters if present (sometimes used in PDFs)
    text = text.replace('\f', '')

    # Trim leading/trailing whitespace
    text = text.strip()

    # Consider removing common OCR errors or specific symbols that don't add value
    # E.g., if you frequently see 'ﬂ' instead of 'fl', add text.replace('ﬂ', 'fl')
    # Or special characters that are not part of regular text
    # text = re.sub(r'[^a-zA-Z0-9\s.,;\'"!@#$%^&*()_+={}\[\]:/?<>]', '', text) # Be careful, this is very restrictive!

    # A common issue for summarization is text being all caps.
    # You might want to consider lowercasing, but it often removes important info (e.g., acronyms)
    # text = text.lower() # Only if strictly necessary

    return text
        