from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import spacy
import pdfplumber
from transformers import pipeline
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import io
import logging

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load NLP models only once for efficiency
try:
    nlp = spacy.load("en_core_web_lg")  # More accurate than 'sm'
    sentiment_analyzer = pipeline("text-classification", model="distilbert-base-uncased-finetuned-sst-2-english")
    similarity_model = SentenceTransformer('all-MiniLM-L6-v2')  # Pre-trained model for semantic similarity
    logger.info("NLP models loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load NLP models: {e}")
    raise RuntimeError("NLP model loading error")

# Define data models
class FeedbackItem(BaseModel):
    type: str
    message: str

class AnalysisResult(BaseModel):
    score: float
    feedback: List[FeedbackItem]

# Utility function for extracting text from PDFs
def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF with pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                extracted_text = page.extract_text()
                if extracted_text:
                    text += extracted_text + "\n"
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        raise HTTPException(status_code=500, detail="Error processing PDF")
    return text.strip()

# Function for calculating keyword-based similarity
def calculate_tfidf_similarity(resume_text: str, job_description: str) -> float:
    """Calculate similarity using TF-IDF vectorizer."""
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
    cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
    return cosine_sim[0][0]

# Function for calculating semantic similarity
def calculate_semantic_similarity(resume_text: str, job_description: str) -> float:
    """Calculate similarity using Sentence Transformers (BERT-based)."""
    embeddings = similarity_model.encode([resume_text, job_description])
    cosine_sim = cosine_similarity([embeddings[0]], [embeddings[1]])
    return cosine_sim[0][0]

# Resume analysis function
def analyze_resume_content(text: str, job_description: Optional[str] = None) -> AnalysisResult:
    """Analyze resume content using NLP and compare to job description."""
    doc = nlp(text)
    feedback = []
    score = 0

    # Check for key sections in the resume
    sections = {"education": False, "experience": False, "skills": False, "contact": False}
    
    for ent in doc.ents:
        if ent.label_ in ["ORG", "DEGREE"]:
            sections["education"] = True
        elif ent.label_ in ["DATE", "ORG"]:
            sections["experience"] = True
        elif ent.label_ in ["SKILL", "PRODUCT"]:
            sections["skills"] = True
        elif ent.label_ in ["PERSON", "EMAIL", "PHONE"]:
            sections["contact"] = True
    
    # Generate feedback for key sections
    for key, present in sections.items():
        if present:
            feedback.append(FeedbackItem(type="success", message=f"{key.capitalize()} section is present"))
            score += 25
        else:
            feedback.append(FeedbackItem(type="warning", message=f"Consider adding a {key} section"))
    
    # Sentiment analysis for professional tone
    sentiment_results = sentiment_analyzer([sent.text for sent in doc.sents if sent.text.strip()])
    positive_count = sum(1 for result in sentiment_results if result["label"] == "POSITIVE")
    sentiment_score = (positive_count / len(sentiment_results)) * 100 if sentiment_results else 0

    if sentiment_score >= 60:
        feedback.append(FeedbackItem(type="success", message="Resume has a professional and positive tone"))
    else:
        feedback.append(FeedbackItem(type="warning", message="Consider using more positive and active language"))
    
    # If a job description is provided, compare the resume to the job description
    if job_description:
        tfidf_similarity = calculate_tfidf_similarity(text, job_description)
        semantic_similarity = calculate_semantic_similarity(text, job_description)

        # Combine both similarities for final score
        score += (tfidf_similarity + semantic_similarity) * 25  # Max score of 100

        # Provide feedback based on the similarity
        if tfidf_similarity > 0.5:
            feedback.append(FeedbackItem(type="success", message="Resume contains relevant keywords for the job"))
        else:
            feedback.append(FeedbackItem(type="warning", message="Consider adding more job-specific keywords"))
        
        if semantic_similarity > 0.5:
            feedback.append(FeedbackItem(type="success", message="Strong semantic match with the job description"))
        else:
            feedback.append(FeedbackItem(type="warning", message="Consider adjusting the resume to better match the job description"))

    return AnalysisResult(score=score, feedback=feedback)

@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), job_description: Optional[str] = None):
    """Handle resume file upload and analysis."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # Limit file size to 5MB
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    text = extract_text_from_pdf(content)
    if not text:
        raise HTTPException(status_code=400, detail="Failed to extract text from PDF. Ensure the document has selectable text.")
    
    result = analyze_resume_content(text, job_description)
    return result

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
