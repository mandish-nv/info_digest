import io
import docx
from fastapi import HTTPException, status
import re
import fitz  # PyMuPDF

def get_file_extension(filename: str) -> str:
    return filename.split('.')[-1].lower()

def is_toc_line(text: str) -> bool:
    toc_keywords = ["table of contents", "contents", "section"]
    if any(kw in text.lower() for kw in toc_keywords):
        return True
    if re.search(r"\.{4,}", text):  # dotted lines common in TOCs
        return True
    if re.match(r"^\d+(\.\d+){1,}[\s\t]+", text):  # 1.1 Section Title
        return True
    return False

def is_subtitle_font(line_font_size: float, body_font_size: float) -> bool:
    if body_font_size == 0:
        return False
    return body_font_size * 1.1 < line_font_size < body_font_size * 1.5

def is_likely_table_block(text: str, spans: list) -> bool:
    if not spans:
        return False

    # Heuristic 1: many spans (columns)
    if len(spans) >= 6:  # lower threshold
        return True

    # Heuristic 2: high digit density
    numeric_chars = sum(c.isdigit() for c in text)
    total_chars = len(text)
    numeric_ratio = numeric_chars / max(total_chars, 1)
    if numeric_ratio >= 0.3:  # lower threshold
        return True

    # Heuristic 3: alignment separators
    if '\t' in text or re.search(r'\s{3,}', text):
        return True

    # Heuristic 4: all uppercase + short words (common in header rows)
    if text.isupper() and all(len(w) <= 15 for w in text.split()):
        return True

    # Heuristic 5: keywords
    table_keywords = ["total", "amount", "qty", "rate", "price", "value"]
    if any(kw in text.lower() for kw in table_keywords):
        return True

    return False




def extract_text_from_docx(file_stream: io.BytesIO) -> str:
    try:
        document = docx.Document(file_stream)
        
        main_content_paragraphs = []

        # Styles commonly used for titles and headings
        exclude_styles_starts_with = ('heading', 'title') 
        
        # Exact styles that are typically non-content
        exclude_exact_styles = ('header', 'footer', 'page number', 'toc', 'no spacing')

        # Common Word styles for captions:
        exclude_styles_for_captions = ('caption', 'figure caption', 'table caption') # Add more as needed

        caption_patterns = [
            re.compile(r"^(Figure|Fig|Illustration|Image)\s+\d+[:\.\-]", re.IGNORECASE),
            re.compile(r"^(Table|Tab)\s+[A-Za-z0-9]+[:\.\-]?", re.IGNORECASE),
            re.compile(r"^\s*([a-z]\)|\([a-z]\))\s+", re.IGNORECASE),
            re.compile(r"^\s*(\d+\.)\s+", re.IGNORECASE),
            re.compile(r"^\s*(Table|Figure)\s+[A-Za-z0-9]+\s*[-:\.]?\s+", re.IGNORECASE),
        ]


        for para in document.paragraphs: 
            style_name_lower = para.style.name.lower()
            paragraph_text_stripped = para.text.strip() 

            # --- Filtering Logic ---
            is_title_or_heading = any(style_name_lower.startswith(s) for s in exclude_styles_starts_with)
            is_specific_excluded_style = any(s in style_name_lower for s in exclude_exact_styles)
            is_empty = not paragraph_text_stripped

            is_caption_style = any(s in style_name_lower for s in exclude_styles_for_captions)

            is_caption_pattern = False
            if not is_caption_style and paragraph_text_stripped: 
                for pattern in caption_patterns:
                    if pattern.search(paragraph_text_stripped):
                        is_caption_pattern = True
                        break

            if not is_title_or_heading and \
               not is_specific_excluded_style and \
               not is_empty and \
               not is_caption_style and \
               not is_caption_pattern:
                
                main_content_paragraphs.append(paragraph_text_stripped)

        return "\n".join(main_content_paragraphs)

    except docx.opc.exceptions.PackageNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not open DOCX file. It might be corrupted or not a valid .docx format: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not process DOCX file: {e}. Ensure it's a valid .docx format and not password-protected."
        )

def extract_text_from_pdf(file_stream: io.BytesIO) -> str:
    main_content_lines = []

    try:
        # Open the PDF document from the byte stream
        doc = fitz.open(stream=file_stream.read(), filetype="pdf")

        # Define thresholds and heuristics (these will likely need tuning for your specific PDFs)
        # 1. Font Size Heuristics:
        #    - A relative measure. You might need to adjust these based on typical body font sizes.
        #    - We'll try to determine body font size dynamically, or use a reasonable default.
        MIN_BODY_FONT_SIZE = 9.0  # Minimum font size for body text (adjust as needed)
        MAX_HEADING_FONT_SIZE_MULTIPLIER = 1.5 # Headings usually 1.5x - 2.5x body font size
        
        # 2. Position Heuristics for Headers/Footers
        #    - Relative to page height. Top 10% and Bottom 10% are often headers/footers.
        HEADER_FOOTER_ZONE_HEIGHT_RATIO = 0.10 

        # 3. Caption Patterns (similar to DOCX, but regex often more crucial here)
        caption_patterns = [
            re.compile(r"^(Table|Tab)\s+[A-Za-z0-9]+[:\.\-]?", re.IGNORECASE),
            re.compile(r"^\s*([a-z]\)|\([a-z]\))\s+", re.IGNORECASE),
            re.compile(r"^\s*(\d+\.)\s+", re.IGNORECASE),
            re.compile(r"^\s*(Table|Figure)\s+[A-Za-z0-9]+\s*[-:\.]?\s+", re.IGNORECASE),
            re.compile(r"^\s*(Table|Tab|TABLE)\s*[\dIVXLC]+[.:]?\s+", re.IGNORECASE),  # e.g., Table 1: or TABLE II.
            re.compile(r"^\s*(Figure|Fig|Image|Illustration)\s*[\dIVXLC]+[.:]?\s+", re.IGNORECASE),
            re.compile(r"^\s*\d+\.\s+", re.IGNORECASE), # 1. Some text
        ]


        # 4. Page Number Patterns
        page_number_patterns = [
            re.compile(r"^\s*(\d+|[ivxlcdmIVXLCDM]+)\s*$", re.IGNORECASE), # Just a number/roman numeral on a line
            re.compile(r"^\s*Page\s+\d+\s*$", re.IGNORECASE),
        ]

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            page_height = page.rect.height

            # Extract text blocks with detailed information (text, bbox, font, size)
            # 'text' is often sufficient, but 'blocks' or 'dict' gives more detail
            # 'blocks' -> (x0, y0, x1, y1, "lines of text", block_no, block_type)
            # 'dict' -> more structured info including fonts, sizes, flags
            text_blocks = page.get_text("dict")["blocks"]

            # Dynamically determine common body font size on this page (simple heuristic)
            # This is a bit of a hack, assumes the most frequent font size is body text
            font_sizes = {}
            for block in text_blocks:
                if block['type'] == 0:  # text block
                    for line in block['lines']:
                        for span in line['spans']:
                            font_sizes[span['size']] = font_sizes.get(span['size'], 0) + len(span['text'])
            
            # Find the most frequent font size by character count
            most_common_font_size = 0
            if font_sizes:
                most_common_font_size = max(font_sizes, key=font_sizes.get)
            
            current_page_body_font_size = max(MIN_BODY_FONT_SIZE, most_common_font_size) # Ensure it's not too small
            
            previous_line_was_table = False
            # Iterate through text blocks and filter
            for block in text_blocks:
                if block['type'] == 0:  # This is a text block
                    for line_dict in block['lines']:
                        line_text = "".join([span['text'] for span in line_dict['spans']]).strip()
                        if not line_text:
                            continue # Skip empty lines

                        # Get font size of the first span in the line (simplification)
                        line_font_size = 0
                        if line_dict['spans']:
                            line_font_size = line_dict['spans'][0]['size']
                        
                        # Get position of the line
                        y0 = line_dict['bbox'][1] # Top Y coordinate of the line

                        # --- Filtering Logic ---
                        is_empty = not line_text
                        
                        # 1. Header/Footer Zone Check
                        is_in_header_footer_zone = (y0 < page_height * HEADER_FOOTER_ZONE_HEIGHT_RATIO) or \
                                                  (y0 > page_height * (1 - HEADER_FOOTER_ZONE_HEIGHT_RATIO))

                        # 2. Font Size Check (heuristic for titles/headings)
                        # Font size checks
                        is_likely_heading_font = (
                            line_font_size > current_page_body_font_size * MAX_HEADING_FONT_SIZE_MULTIPLIER
                        )
                        is_subtitle = is_subtitle_font(line_font_size, current_page_body_font_size)
                        
                        # 3. Caption Pattern Check
                        is_caption_pattern = False
                        for pattern in caption_patterns:
                            if pattern.search(line_text):
                                is_caption_pattern = True
                                break
                        
                        # 4. Page Number Pattern Check
                        is_page_number = False
                        for pattern in page_number_patterns:
                            if pattern.fullmatch(line_text): # Use fullmatch for whole line numbers
                                is_page_number = True
                                break
                        
                        # 5. Short line heuristic (be careful with this, can remove valid content)
                        # Example: Single word sub-headings, list items
                        is_very_short_line = len(line_text) < 15 and ' ' not in line_text # Very short and no spaces

                        is_table_block = is_likely_table_block(line_text, line_dict.get("spans", []))
                        
                        # Skip if it's caption or near table
                        if is_caption_pattern or previous_line_was_table:
                            previous_line_was_table = is_caption_pattern or is_table_block
                            continue  # Skip captions or lines near table

                        if not is_empty and \
                        not is_in_header_footer_zone and \
                        not is_likely_heading_font and \
                        not is_caption_pattern and \
                        not is_page_number and \
                        not is_very_short_line and \
                        not is_subtitle and \
                        not is_toc_line(line_text) and \
                        not is_table_block:
                            main_content_lines.append(line_text)


        # Post-processing: Additional cleanup after initial extraction
        # This part is crucial for PDFs due to potential layout issues
        
        cleaned_text_lines = []
        previous_line = ""

        for current_line in main_content_lines:
            # 1. Remove excess whitespace (already done by .strip(), but good to reiterate)
            current_line = current_line.strip()

            if not current_line: # Skip empty lines that might have slipped through
                continue

            # 2. Handle hyphenation across lines (common in PDFs)
            # If previous line ends with hyphen and current line starts lowercase, attempt to merge
            if previous_line.endswith('-') and current_line and current_line[0].islower():
                cleaned_text_lines[-1] = previous_line[:-1] + current_line # Remove hyphen and join
            else:
                cleaned_text_lines.append(current_line)
            
            previous_line = current_line
            
        # 3. Join lines, then apply more general regex for typical "boilerplate" text
        final_text = "\n".join(cleaned_text_lines)

        # General Regex Post-Processing for common boilerplate/junk that might slip through
        # Examples: "Confidential", "Proprietary", long lines of underscores/dashes, emails, URLs
        # Be very careful with these, as they can remove actual content
        patterns_to_remove = [
            r"\b(confidential|proprietary|internal use only)\b", # Common confidentiality footers
            r"^\s*_{5,}\s*$", # Lines of underscores
            r"^\s*[-=]{5,}\s*$", # Lines of dashes or equals signs
            r"\b(?:https?|ftp)://\S+\b", # URLs
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", # Email addresses
            r"^\s*\[\s*\]\s*$", # Empty brackets
            r"^\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{2,4}|\d{4}-\d{2}-\d{2})\s*$", # Dates like 01/01/2023 or 2023-01-01
            r"^\s*Revision\s+\d+\.?\d*\s*$", # "Revision 1.0"
            r"^\s*Document ID:\s+\S+\s*$", # Document IDs
            # Add more patterns based on observed non-content in your documents
        ]
        
        for pattern in patterns_to_remove:
            final_text = re.sub(pattern, "", final_text, flags=re.IGNORECASE | re.MULTILINE).strip()
        
        # Remove multiple consecutive newlines (reduces empty space)
        final_text = re.sub(r"\n\s*\n", "\n", final_text).strip()

        return final_text

    except fitz.FileDataError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not open PDF file. It might be corrupted or not a valid PDF format: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not process PDF file: {e}. Ensure it's a valid PDF format and not password-protected."
        )