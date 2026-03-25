/**
 * agentService.ts
 * Frontend interface for the autonomous agent loop.
 * Streams SSE events from Spring Boot /api/ai/agent endpoint.
 */

import { CONFIG } from "@/react-app/lib/config";

// ─── Event Types ─────────────────────────────────────────────────────────────

export type AgentEventType =
    | 'thought'     // 🧠 "Thinking... (Step N)"
    | 'step'        // 📌 Step metadata (step, plan, reason)
    | 'action'      // 🔧 Tool about to execute (tool, label, path, command, query)
    | 'result'      // ✅/❌ Tool result (success, result)
    | 'done'        // 🏁 Agent finished
    | 'error'       // 💥 Error
    // Legacy types (kept for backward compat)
    | 'tool_call'
    | 'tool_result'
    | 'step_start'
    | 'token'
    | 'response';

export interface AgentThought      { type: 'thought';     message: string; }
export interface AgentStep         { type: 'step';        step: string; plan: string; reason: string; }
export interface AgentAction       { type: 'action';      tool: string; label: string; path?: string; command?: string; query?: string; }
export interface AgentResult       { type: 'result';      success: boolean; tool: string; result: string; }
export interface AgentDone         { type: 'done';        success: boolean; output: string; iterations: number; }
export interface AgentError        { type: 'error';       message: string; }

// Legacy types
export interface AgentToolCall     { type: 'tool_call';   action: { type: string; path?: string; command?: string }; }
export interface AgentToolResult   { type: 'tool_result'; success: boolean; result: string; }
export interface AgentStepStart    { type: 'step_start';  iteration: number; maxIterations: number; }
export interface AgentToken        { type: 'token';       content: string; }
export interface AgentResponse     { type: 'response';    content: string; }

export type AgentEvent =
    | AgentThought | AgentStep | AgentAction | AgentResult | AgentDone | AgentError
    | AgentToolCall | AgentToolResult | AgentStepStart | AgentToken | AgentResponse;

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface AgentCallbacks {
    onThought?:    (e: AgentThought)    => void;
    onStep?:       (e: AgentStep)       => void;
    onAction?:     (e: AgentAction)     => void;
    onResult?:     (e: AgentResult)     => void;
    onDone?:       (e: AgentDone)       => void;
    onError?:      (e: AgentError)      => void;
    // Legacy
    onToolCall?:   (e: AgentToolCall)   => void;
    onToolResult?: (e: AgentToolResult) => void;
    onStepStart?:  (e: AgentStepStart)  => void;
    onToken?:      (e: AgentToken)      => void;
    onResponse?:   (e: AgentResponse)   => void;
    // Generic fallback
    onEvent?:      (e: AgentEvent)      => void;
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface AgentRunOptions {
    prompt: string;
    workspaceRoot?: string;
    model?: string;
    activeFilePath?: string;
    activeFileContent?: string;
    selection?: string;
    signal?: AbortSignal;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const BACKEND_URL = CONFIG.TERMINAL_SERVER_URL || 'http://localhost:8081';

export const agentService = {
    /**
     * Run the autonomous agent loop via SSE.
     * Streams events from Spring Boot backend and fires provided callbacks.
     */
    async run(options: AgentRunOptions, callbacks: AgentCallbacks): Promise<void> {
        const { prompt, workspaceRoot, model, activeFilePath, activeFileContent, selection, signal } = options;

        let res: Response;
        try {
            res = await fetch(`${BACKEND_URL}/api/ai/agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    workspaceRoot: workspaceRoot || '',
                    model: model || 'qwen2.5-coder:7b',
                    activeFilePath: activeFilePath || '',
                    activeFileContent: activeFileContent || '',
                    selection: selection || '',
                }),
                signal,
            });
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                callbacks.onError?.({ type: 'error', message: err?.message || 'Network error reaching agent' });
                callbacks.onEvent?.({ type: 'error', message: err?.message || 'Network error reaching agent' });
            }
            return;
        }

        if (!res.ok || !res.body) {
            const errText = await res.text().catch(() => 'Unknown error');
            callbacks.onError?.({ type: 'error', message: `Agent endpoint error (${res.status}): ${errText}` });
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                // SSE format: lines may be prefixed with "data: "
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    // Strip SSE "data: " prefix if present
                    const jsonStr = trimmed.startsWith('data:')
                        ? trimmed.slice(5).trim()
                        : trimmed;

                    if (!jsonStr) continue;

                    try {
                        const event: AgentEvent = JSON.parse(jsonStr);
                        callbacks.onEvent?.(event);
                        dispatchEvent(event, callbacks);
                    } catch (_) {
                        // Skip unparseable lines
                    }
                }
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                callbacks.onError?.({ type: 'error', message: err?.message || 'Stream read error' });
            }
        } finally {
            reader.releaseLock();
        }
    },

    /**
     * Returns a human-readable label for a tool action type.
     */
    getToolLabel(actionType: string, path?: string, command?: string, query?: string): string {
        const labels: Record<string, string> = {
            readFile:    `📄 Reading: ${path}`,
            read_file:   `📄 Reading: ${path}`,
            writeFile:   `✏️  Writing: ${path}`,
            write_file:  `✏️  Writing: ${path}`,
            createFile:  `🆕 Creating: ${path}`,
            create_file: `🆕 Creating: ${path}`,
            applyDiff:   `✂️  Patching: ${path}`,
            apply_diff:  `✂️  Patching: ${path}`,
            deleteFile:  `🗑️  Deleting: ${path}`,
            delete_file: `🗑️  Deleting: ${path}`,
            runCommand:  `⚙️  Running: ${command}`,
            run_command: `⚙️  Running: ${command}`,
            search:      `🔍 Searching: ${query}`,
            listFiles:   `📁 Listing: ${path || 'workspace'}`,
            list_files:  `📁 Listing: ${path || 'workspace'}`,
        };
        return labels[actionType] ?? `🔧 ${actionType}`;
    },
};

// ─── Internal dispatcher ─────────────────────────────────────────────────────

function dispatchEvent(event: AgentEvent, callbacks: AgentCallbacks) {
    switch (event.type) {
        case 'thought':     callbacks.onThought?.(event);    break;
        case 'step':        callbacks.onStep?.(event);       break;
        case 'action':      callbacks.onAction?.(event);     break;
        case 'result':      callbacks.onResult?.(event);     break;
        case 'done':        callbacks.onDone?.(event);       break;
        case 'error':       callbacks.onError?.(event);      break;
        case 'tool_call':   callbacks.onToolCall?.(event);   break;
        case 'tool_result': callbacks.onToolResult?.(event); break;
        case 'step_start':  callbacks.onStepStart?.(event);  break;
        case 'token':       callbacks.onToken?.(event);      break;
        case 'response':    callbacks.onResponse?.(event);   break;
    }
}
