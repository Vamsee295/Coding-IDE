import * as monaco from 'monaco-editor';
import { CONFIG } from '@/react-app/lib/config';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentController: AbortController | null = null;
let lastRequestHash: string | null = null;
let lastResponse: any = null;
let cancelPrevPromise: ((value: any) => void) | null = null;

export const autocompleteProvider: monaco.languages.InlineCompletionsProvider = {
    freeInlineCompletions() {},
    async provideInlineCompletions(model, position, context, token) {
        const MAX_LINES = 30;
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

        const requestHash = `${position.lineNumber}:${position.column}:${textBeforePointer.length}`;
        if (lastRequestHash === requestHash && lastResponse) {
             return lastResponse;
        }

        return new Promise((resolve) => {
            if (cancelPrevPromise) {
                cancelPrevPromise({ items: [] });
            }
            cancelPrevPromise = resolve;

            if (debounceTimer) clearTimeout(debounceTimer);
            if (currentController) currentController.abort();

            currentController = new AbortController();
            const signal = currentController.signal;

            debounceTimer = setTimeout(async () => {
                try {
                    let completionModel = 'qwen2.5-coder:1.5b';
                    try {
                        const settingsRaw = localStorage.getItem('ide-settings');
                        if (settingsRaw) {
                            const parsed = JSON.parse(settingsRaw);
                            if (parsed.aiCompletionModel) completionModel = parsed.aiCompletionModel;
                        }
                    } catch(e) {}

                    const prompt = `<|fim_prefix|>${textBeforePointer}<|fim_suffix|>${textAfterPointer}<|fim_middle|>`;

                    const response = await fetch(`${CONFIG.PYTHON_API_URL}/ai/stream`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: completionModel,
                            prompt: prompt,
                            stream: false,
                            options: {
                                num_predict: 48,
                                temperature: 0.1,
                                stop: ["<|file_separator|>", "<|endoftext|>"]
                            }
                        }),
                        signal
                    });

                    if (!response.ok) {
                        resolve({ items: [] });
                        cancelPrevPromise = null;
                        return;
                    }

                    const data = await response.json();
                    if (data && data.response) {
                        const suggestion = data.response.trimEnd();
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
                            cancelPrevPromise = null;
                            return;
                        }
                    }
                    resolve({ items: [] });
                    cancelPrevPromise = null;
                } catch (e: any) {
                    resolve({ items: [] });
                    cancelPrevPromise = null;
                }
            }, 300);
        });
    }
};