import io
import os
import time
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAI
from pypdf import PdfReader
from docx import Document

load_dotenv()

app = FastAPI(
    title="Text Summarization AI API",
    description="AI-powered text summarization service.",
    version="1.0.0",
)

# Allow the GitHub Pages frontend to communicate with the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = os.getenv("MODEL", "gpt-5-nano")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


@app.get("/")
def root():
    return {
        "name": "Text Summarization AI API",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL,
        "api_key_configured": client is not None,
    }


def extract_text_from_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))

    pages = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        pages.append(page_text)

    return "\n".join(pages).strip()


def extract_text_from_docx(data: bytes) -> str:
    document = Document(io.BytesIO(data))

    paragraphs = [
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    ]

    return "\n".join(paragraphs).strip()


async def extract_uploaded_text(file: UploadFile) -> str:
    data = await file.read()

    filename = (file.filename or "").lower()

    if filename.endswith(".txt"):
        return data.decode("utf-8", errors="ignore").strip()

    if filename.endswith(".pdf"):
        return extract_text_from_pdf(data)

    if filename.endswith(".docx"):
        return extract_text_from_docx(data)

    raise ValueError(
        "Unsupported file type. Please upload a TXT, PDF, or DOCX file."
    )


def word_count(text: str) -> int:
    return len(text.split())


def calculate_compression(
    original_words: int,
    summary_words: int,
) -> float:
    if original_words <= 0:
        return 0.0

    reduction = 1 - (summary_words / original_words)

    return max(0.0, min(100.0, reduction * 100))


def generate_summary(
    source_text: str,
    instruction: str,
    summary_length: str,
):
    if client is None:
        raise RuntimeError(
            "OPENAI_API_KEY is not configured on the server."
        )

    length_guidance = {
        "Short": "Produce a very concise summary of approximately 2-4 sentences.",
        "Medium": "Produce a concise but sufficiently detailed summary of approximately 1-3 paragraphs.",
        "Long": "Produce a detailed summary covering the major ideas, findings, and relevant context.",
    }

    guidance = length_guidance.get(
        summary_length,
        length_guidance["Medium"],
    )

    system_prompt = f"""
You are an expert text summarization assistant.

Your task is to summarize the provided document accurately.

{guidance}

The summary must:
- Preserve important facts and meaning.
- Avoid inventing information.
- Remove unnecessary repetition.
- Be easy to read.
- Follow the user's instruction when possible.

Return valid JSON with exactly these fields:

{{
  "summary": "The generated summary",
  "key_points": [
    "Important point 1",
    "Important point 2",
    "Important point 3"
  ]
}}

Return only JSON.
"""

    user_prompt = f"""
USER INSTRUCTION:
{instruction}

SOURCE TEXT:
{source_text}
"""

    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
    )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError("The model returned an empty response.")

    import json

    return json.loads(content)


@app.post("/api/summarize")
async def summarize(
    file: Optional[UploadFile] = File(default=None),
    text: str = Form(default=""),
    instruction: str = Form(
        default="Summarize the key ideas clearly and concisely."
    ),
    summary_length: str = Form(default="Medium"),
):
    start_time = time.perf_counter()

    try:
        source_text = text.strip()

        if file is not None:
            uploaded_text = await extract_uploaded_text(file)

            if uploaded_text:
                if source_text:
                    source_text = f"{source_text}\n\n{uploaded_text}"
                else:
                    source_text = uploaded_text

        if not source_text:
            return JSONResponse(
                status_code=400,
                content={
                    "detail": "Please upload a document or provide text."
                },
            )

        # Prevent unexpectedly large requests.
        if len(source_text) > 100_000:
            return JSONResponse(
                status_code=413,
                content={
                    "detail": (
                        "The document is too large. "
                        "Please provide a shorter document."
                    )
                },
            )

        original_words = word_count(source_text)

        generated = generate_summary(
            source_text=source_text,
            instruction=instruction,
            summary_length=summary_length,
        )

        summary = str(generated.get("summary", "")).strip()

        key_points = generated.get("key_points", [])

        if not isinstance(key_points, list):
            key_points = []

        key_points = [
            str(point).strip()
            for point in key_points
            if str(point).strip()
        ][:5]

        summary_words = word_count(summary)

        compression = calculate_compression(
            original_words,
            summary_words,
        )

        latency_ms = (time.perf_counter() - start_time) * 1000

        return {
            "summary": summary,
            "key_points": key_points,
            "original_word_count": original_words,
            "summary_word_count": summary_words,
            "compression_percentage": compression,
            "latency_ms": latency_ms,
            "model": MODEL,
        }

    except ValueError as exc:
        return JSONResponse(
            status_code=400,
            content={"detail": str(exc)},
        )

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Summarization service error: {str(exc)}"
            },
        )
