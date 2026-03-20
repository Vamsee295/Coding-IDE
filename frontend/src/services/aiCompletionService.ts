import { CONFIG } from '../react-app/lib/config';
import * as monaco from 'monaco-editor';

/**
 * Service to fetch AI completions for the Monaco Editor inline ghost text.
 * Talks to our local terminal-server proxy, which forwards to Ollama.
 */
class AICompletionService {
    private abortController: AbortController | null = null;
    
    // Configurable model name - we default to a fast coder model
    private modelName = 'qwen2.5-coder:1.5b';

    public async getCompletion(
        prefix: string,
        suffix: string,
        token: monaco.CancellationToken
    ): Promise<string | null> {
        // Cancel any pending request if the user keeps typing
        if (this.abortController) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // Hook up Monaco's cancellation token to our abort controller
        const tokenDisposable = token.onCancellationRequested(() => {
            this.abortController?.abort();
        });

        try {
            // Give a tiny natural typing debounce (if they type fast, the cancellation token handles it)
            await new Promise(resolve => setTimeout(resolve, 300));
            if (token.isCancellationRequested) return null;

            // Optional: Limit context to last N characters to avoid massive payloads on huge files
            const maxContext = 2000;
            const truncatedPrefix = prefix.length > maxContext ? prefix.slice(-maxContext) : prefix;
            const truncatedSuffix = suffix.length > maxContext ? suffix.slice(0, maxContext) : suffix;

            const response = await fetch(`${CONFIG.TERMINAL_API_URL}/ai/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: truncatedPrefix,
                    suffix: truncatedSuffix,
                    model: this.modelName
                }),
                signal
            });

            if (!response.ok) {
                console.warn('[AI Completion] Backend returned error:', response.statusText);
                return null;
            }

            const data = await response.json();
            return data.completion || null;

        } catch (error: any) {
            if (error.name === 'AbortError') {
                // Ignore expected aborts from typing fast
                return null;
            }
            console.error('[AI Completion] Error fetching suggestion:', error);
            return null;
        } finally {
            tokenDisposable.dispose();
            // Clear controller if it's still ours
            if (this.abortController?.signal === signal) {
                this.abortController = null;
            }
        }
    }
}

export const aiCompletionService = new AICompletionService();
