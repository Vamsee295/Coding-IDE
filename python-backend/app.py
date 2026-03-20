from flask import Flask, request, jsonify
from flask_cors import CORS
import os
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

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5001))
    print(f"[PythonServer] Running on port {port}...")
    app.run(host='0.0.0.0', port=port)
