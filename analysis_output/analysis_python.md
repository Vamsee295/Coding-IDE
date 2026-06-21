## Python Backend Analysis

The Python backend is a lightweight Flask application used specifically for AI auxiliary tasks (Vector Search & OCR Screen Analysis).

### Routes
- **`/health`** (GET): Basic health check.
- **`/vector/add`** (POST): Adds file content to the FAISS vector index.
- **`/vector/search`** (POST): Searches the FAISS index for relevant documents.
- **`/vector/clear`** (POST): Clears the FAISS index.
- **`/screen/analyze`** (GET/POST): Captures the host screen and analyzes it using OCR (Tesseract).

### Features
- **FAISS Vector Database (`faiss_service.py`)**: Used for generating an embedding index of the workspace to provide AI context.
- **Screen OCR (`screen_service.py`)**: Uses `pytesseract` to take screenshots and extract text for context.

### Integration (Is it used?)
**YES.** It is actively used.
- The `terminal-server` (`indexerService.js` and `api.js`) explicitly makes HTTP calls to `http://localhost:5001` for `/vector/clear`, `/vector/add`, `/vector/search`, and `/screen/analyze`.
- The Frontend (`Home.tsx`) also references `http://localhost:5001` in an error message if the screen analysis fails.

### Dependencies (`requirements.txt`)
Assumed to contain `Flask`, `flask-cors`, `faiss-cpu` (or `faiss-gpu`), `sentence-transformers` (or similar), `pytesseract`, `Pillow`.
