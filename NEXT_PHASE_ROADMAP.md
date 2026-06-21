# Next Phase Roadmap: Product AI Features

With the architecture simplified to a clean React -> Node -> Python stack, development can now focus entirely on making StackFlow a best-in-class AI IDE.

No new architectural layers should be introduced. All efforts must prioritize the following 6 product features:

## 1. Workspace RAG (Retrieval-Augmented Generation)
- **Goal:** Allow the AI to understand the entire codebase perfectly.
- **Action:** Enhance the Python FAISS implementation to automatically chunk and embed the active workspace root whenever it is loaded or modified. Use these embeddings to augment chat queries.

## 2. AI Code Actions (Inline Editing)
- **Goal:** Allow users to highlight code and hit `Cmd+I` to generate or refactor code inline.
- **Action:** Utilize the existing Monaco Editor diff extensions and Python LLM streaming to apply patch diffs directly over the user's selection.

## 3. Agent Mode
- **Goal:** Autonomous, multi-step problem solving.
- **Action:** Build out the `agentService.ts` to coordinate with Python. Python should return executable tool commands (e.g., `run_command(npm test)`, `read_file(app.ts)`) that Node.js will execute securely on the host.

## 4. AI Debugger
- **Goal:** Automatically diagnose and fix terminal errors.
- **Action:** Intercept terminal outputs from `node-pty`. If an exit code > 0 or a stack trace is detected, automatically query the Python backend to provide a diagnosis and a one-click fix.

## 5. Git Intelligence
- **Goal:** Smart commit generation.
- **Action:** Integrate Node.js `git diff` outputs into an AI prompt to auto-generate meaningful commit messages following conventional commit standards.

## 6. Context-Aware Code Generation (Tab Autocomplete)
- **Goal:** "Copilot-style" ghost text in the editor.
- **Action:** Connect Monaco's inline completion provider to a fast, locally-hosted model (like `deepseek-coder` or `qwen2.5-coder`) via the Python proxy.
