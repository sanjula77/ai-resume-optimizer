# AI Resume Optimizer Backend

This is the Python backend for the AI Resume Optimizer, using FastAPI, Hugging Face Transformers, and spaCy for NLP analysis.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Download spaCy model:
```bash
python -m spacy download en_core_web_sm
```

4. Run the server:
```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000