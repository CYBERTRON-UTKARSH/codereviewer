# RAG Code Reviewer

A full-stack **Retrieval-Augmented Generation (RAG) Code Reviewer** that analyzes source code across **Python, Java, JavaScript, C++, and Go**. It retrieves relevant language-specific coding standards and best practices from a persistent **ChromaDB** vector store using **Cohere** embeddings (`embed-english-light-v3.0`), then uses **Groq** (`openai/gpt-oss-120b`) to return structured diagnostics, `0–100` aspect scores, improvement notes, and cleaner refactored code through a **FastAPI** backend and **React** frontend.

---

## Architecture, Working & Processing

```text
[React Frontend (Vercel)]
        │
        ▼  POST /review  { code, language }
[FastAPI Backend (Render)]
        ├──► 1. Embed query code via Cohere (embed-english-light-v3.0, search_query)
        ├──► 2. Query ChromaDB (./code_rag_db -> code_review_standards) filtered by language
        ├──► 3. Combine retrieved standards (aspect, severity, rule) with the submitted code
        ├──► 4. Generate structured JSON review & refactored code via Groq (openai/gpt-oss-120b)
        └──► 5. Validate schema via Pydantic and return response to the frontend
```

### How It Works

1. **Knowledge Ingestion:** Coding rules, security checklists, and language idioms are tagged with metadata (`language`, `aspect`, `severity`), embedded using Cohere (`search_document`), and stored persistently in `./code_rag_db` under the `code_review_standards` collection.
2. **Input Validation:** FastAPI validates incoming `POST /review` requests (`code` up to 20,000 characters and supported `language`) using Pydantic.
3. **Standards Retrieval (RAG):** The backend embeds the user's code snippet with Cohere (`search_query`) and queries `code_review_standards` for the top 3 matching standards filtered by target language, falling back safely to general industry best practices if needed.
4. **LLM Analysis & Refactoring:** Groq (`openai/gpt-oss-120b`) evaluates the code against the retrieved standards and returns a strict JSON payload containing errors, security issues, `0–100` aspect scores (`security`, `correctness`, `readability`, `efficiency`), an overall score, improvement notes, and refactored code.
5. **Frontend Rendering:** The validated JSON response is returned to the React UI to display diagnostics, score breakdowns, and suggested code.

---

## How to Build This Project From Scratch

1. **Set Up Project Structure & Dependencies:** Create a workspace with `backend/` and `frontend/` folders, add a `requirements.txt` (`fastapi`, `uvicorn[standard]`, `pydantic`, `chromadb`, `cohere`, `groq`, `python-dotenv`), and install the packages.
2. **Configure API Keys:** Obtain API keys from **Cohere** and **Groq**, and set `COHERE_API_KEY` and `GROQ_API_KEY` in your environment variables (keep local `.env` files out of Git).
3. **Create & Run `ingestion.py`:** Write `ingestion.py` to load your multi-language coding standards with metadata (`language`, `aspect`, `severity`), generate Cohere document embeddings (`input_type="search_document"`), and persist them into `code_rag_db` under the `code_review_standards` collection. Run `ingestion.py` once to generate the vector database.
4. **Create `main.py` (FastAPI Backend):** Build `main.py` to connect to `code_rag_db`, embed incoming code snippets (`input_type="search_query"`), retrieve matching language rules, call Groq in JSON mode, validate the response with Pydantic models, and expose `/`, `/health`, and `/review` with CORS enabled.
5. **Build the React Frontend:** Create the React interface in `frontend/` with a code editor, language selector, and results dashboard connected to your backend API URL via an environment variable.
6. **Deploy:** Push the project (including `code_rag_db/`, excluding `.env`, `.venv/`, and `node_modules/`) to **GitHub**, deploy the FastAPI backend on **Render** (`uvicorn main:app --host 0.0.0.0 --port $PORT` with your API keys added in Render's Environment tab), and deploy the React frontend on **Vercel**.