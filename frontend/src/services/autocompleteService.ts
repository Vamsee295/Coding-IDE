import * as monaco from 'monaco-editor';
import { CONFIG } from '@/react-app/lib/config';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentController: AbortController | null = null;
let lastRequestHash: string | null = null;
let lastResponse: any = null;

export const autocompleteProvider: monaco.languages.InlineCompletionsProvider = {
    freeInlineCompletions() {},
    async provideInlineCompletions(model, position, context, token) {
        // Fast exit conditions (don't autocomplete strictly if we're doing an explicit undo or something)

        // Get surrounding context. To keep it fast, we only grab the current line and maybe a few lines before/after.
        // FIM format requires precise parsing.

        const MAX_LINES = 30; // only send 30 lines of context to keep it fast
        const startLine = Math.max(1, position.lineNumber - Math.floor(MAX_LINES/2));
        const endLine = Math.min(model.getLineCount(), position.lineNumber + Math.floor(MAX_LINES/2));

        const textBeforePointer = model.getValueInRange({
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        });

        const textAfterPointer = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: endLine,
            endColumn: model.getLineMaxColumn(endLine)
        });

        // Basic request deduplication
        const requestHash = `${position.lineNumber}:${position.column}:${textBeforePointer.length}`;
        if (lastRequestHash === requestHash && lastResponse) {
             return lastResponse;
        }

        return new Promise((resolve) => {
            if (debounceTimer) clearTimeout(debounceTimer);
            if (currentController) currentController.abort();

            currentController = new AbortController();
            const signal = currentController.signal;

            debounceTimer = setTimeout(async () => {
                try {
                    // Pull the completion model from local storage settings if it exists
                    let completionModel = 'qwen2.5-coder:1.5b'; // Fast default
                    try {
                        const settingsRaw = localStorage.getItem('ide-settings');
                        if (settingsRaw) {
                            const parsed = JSON.parse(settingsRaw);
                            if (parsed.aiCompletionModel) {
                                completionModel = parsed.aiCompletionModel;
                            }
                        }
                    } catch(e) {}

                    // FIM standard for Qwen coder FIM tokens:
                    // <|fim_prefix|> context before <|fim_suffix|> context after <|fim_middle|>
                    const prompt = `<|fim_prefix|>${textBeforePointer}<|fim_suffix|>${textAfterPointer}<|fim_middle|>`;

                    const response = await fetch(`${CONFIG.PYTHON_API_URL}/ai/stream`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: completionModel,
                            prompt: prompt,
                            stream: false,
                            options: {
                                num_predict: 48, // Limit generation to keep it snappy
                                temperature: 0.1, // Low temperature for code
                                stop: ["<|file_separator|>", "<|endoftext|>"]
                            }
                        }),
                        signal
                    });

                    if (!response.ok) {
                        resolve({ items: [] });
                        return;
                    }

                    const data = await response.json();
                    if (data && data.response) {
                        const suggestion = data.response.trimEnd(); // Remove trailing empty space
                        if (suggestion) {
                            const completionResult = {
                                items: [{
                                    insertText: suggestion,
                                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
                                }]
                            };
                            lastRequestHash = requestHash;
                            lastResponse = completionResult;
                            resolve(completionResult);
                            return;
                        }
                    }
                    resolve({ items: [] });
                } catch (e: any) {
                    if (e.name !== 'AbortError') {
                        console.error('Autocomplete error:', e);
                    }
                    resolve({ items: [] });
                }
            }, 300); // 300ms debounce as requested
        });
    }
};
