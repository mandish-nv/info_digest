# python-api/my_functions.py

def greet(name: str) -> str:
    """A simple function to greet a user."""
    return f"Hello, {name} from FastAPI!"

def calculate_sum(a: int, b: int) -> int:
    """Calculates the sum of two integers."""
    return a + b

def process_text_for_sentiment(text: str) -> dict:
    """
    Simulates processing text for sentiment analysis.
    In a real app, you'd use NLTK, SpaCy, Transformers, etc.
    """
    sentiment = "neutral"
    if "good" in text.lower() or "happy" in text.lower():
        sentiment = "positive"
    elif "bad" in text.lower() or "sad" in text.lower():
        sentiment = "negative"
    return {"original_text": text, "sentiment": sentiment, "source": "FastAPI"}

# You can add more complex functions here as needed