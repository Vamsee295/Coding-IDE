import axios from "axios";

import { CONFIG } from "@/react-app/lib/config";

const BASE = `${CONFIG.API_BASE_URL}/workspace`;

export interface WorkspaceInfo {
    path: string;
    type: "NODE" | "MAVEN" | "GRADLE" | "PYTHON" | "RUST" | "UNKNOWN";
}

export interface ContextResult {
    path: string;
    name: string;
    content: string;
}

/** Open a folder as the active workspace and get back detected project type */
export async function openWorkspace(path: string): Promise<WorkspaceInfo> {
    // Notify Java backend
    const res = await axios.post<WorkspaceInfo>(`${BASE}/open`, { path });
    
    // Notify Node.js terminal-server
    try {
        await axios.post(`${CONFIG.TERMINAL_API_URL}/workspace/set`, { path });
    } catch (e) {
        console.error("[WorkspaceService] Failed to notify terminal-server of new workspace", e);
    }

    return res.data;
}

/** Get current workspace info (path + type) */
export async function getWorkspaceInfo(): Promise<WorkspaceInfo> {
    const res = await axios.get<WorkspaceInfo>(`${BASE}/info`);
    return res.data;
}

/** Trigger re-indexing of the workspace for AI context */
export async function reindexWorkspace(): Promise<void> {
    try {
        await axios.post(`${CONFIG.TERMINAL_API_URL}/ai/reindex`);
    } catch (e) {
        console.error("[WorkspaceService] Failed to trigger re-indexing", e);
    }
}

/** Search for relevant code context based on query */
export async function searchContext(query: string, limit: number = 3): Promise<ContextResult[]> {
    try {
        const res = await axios.get<{ results: ContextResult[] }>(`${CONFIG.TERMINAL_API_URL}/ai/search-context`, {
            params: { query, limit }
        });
        return res.data.results;
    } catch (e) {
        console.error("[WorkspaceService] Failed to search context", e);
        return [];
    }
}

/** Semantic search using Vector DB (FAISS) */
export async function searchVectorContext(query: string, limit: number = 5): Promise<ContextResult[]> {
    try {
        const res = await axios.get<{ results: ContextResult[] }>(`${CONFIG.TERMINAL_API_URL}/ai/vector-search`, {
            params: { query, limit }
        });
        return res.data.results;
    } catch (e) {
        console.error("[WorkspaceService] Failed to search vector context", e);
        return [];
    }
}

/** Analyze current screen via OCR */
export async function analyzeScreen(): Promise<{ text: string, image?: string, success: boolean, error?: string }> {
    try {
        const res = await axios.get(`${CONFIG.TERMINAL_API_URL}/ai/analyze-screen`);
        return res.data;
    } catch (e: any) {
        console.error("[WorkspaceService] Failed to analyze screen", e);
        return { text: "", success: false, error: e.message };
    }
}
