from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import os
import requests
import json
from faiss_service import vector_service
from screen_service import screen_service

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/vector/add', methods=['POST'])
def add_document():
    data = request.json
    path = data.get('path')
    content = data.get('content')
    if path and content:
        vector_service.add_file(path, content)
        return jsonify({"status": "indexed", "path": path})
    return jsonify({"error": "Missing path or content"}), 400

@app.route('/vector/search', methods=['POST'])
def search():
    data = request.json
    query = data.get('query')
    limit = data.get('limit', 5)
    if query:
        results = vector_service.search(query, top_k=limit)
        return jsonify({"results": results})
    return jsonify({"error": "Missing query"}), 400

@app.route('/vector/clear', methods=['POST'])
def clear():
    vector_service.clear()
    return jsonify({"status": "cleared"})

@app.route('/screen/analyze', methods=['GET', 'POST'])
def analyze_screen():
    result = screen_service.capture_screen()
    return jsonify(result)

# --- AI Proxies ---
OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

@app.route('/ai/models', methods=['GET'])
def ai_models():
    # The frontend allows overriding the endpoint via query param, fallback to default
    endpoint = request.args.get('endpoint', OLLAMA_BASE)
    try:
        # Some frontend components expect the Spring Boot format, some use direct Ollama tags.
        # Spring Boot `/api/ai/models` returns a simple string array or object list.
        # Direct ollama /api/tags returns { "models": [ { "name": "llama3", ... } ] }
        # We will mirror direct Ollama tags here.
        resp = requests.get(f"{endpoint.rstrip('/')}/api/tags", timeout=5)
        resp.raise_for_status()
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ai/pull', methods=['POST'])
def ai_pull():
    data = request.json or {}
    model_name = data.get('model')
    endpoint = data.get('ollamaEndpoint', OLLAMA_BASE)
    if not model_name:
        return jsonify({"error": "Missing model"}), 400
    try:
        # Proxy the pull command to the specified Ollama endpoint
        resp = requests.post(f"{endpoint.rstrip('/')}/api/pull", json={"name": model_name}, timeout=120)
        resp.raise_for_status()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ai/stream', methods=['POST'])
def ai_stream():
    data = request.json or {}
    def generate():
        try:
            with requests.post(f"{OLLAMA_BASE.rstrip('/')}/api/generate", json=data, stream=True, timeout=120) as r:
                r.raise_for_status()
                for chunk in r.iter_content(chunk_size=1024):
                    if chunk:
                        yield chunk
        except Exception as e:
            yield json.dumps({"error": str(e)}).encode('utf-8')

    return Response(stream_with_context(generate()), content_type='application/json')

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5001))
    print(f"[PythonServer] Running on port {port}...")
    app.run(host='0.0.0.0', port=port)
