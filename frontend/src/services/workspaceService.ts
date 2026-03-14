import axios from "axios";

import { CONFIG } from "@/react-app/lib/config";

const BASE = `${CONFIG.API_BASE_URL}/workspace`;

export interface WorkspaceInfo {
    path: string;
    type: "NODE" | "MAVEN" | "GRADLE" | "PYTHON" | "RUST" | "UNKNOWN";
}

/** Open a folder as the active workspace and get back detected project type */
export async function openWorkspace(path: string): Promise<WorkspaceInfo> {
    const res = await axios.post<WorkspaceInfo>(`${BASE}/open`, { path });
    return res.data;
}

/** Get current workspace info (path + type) */
export async function getWorkspaceInfo(): Promise<WorkspaceInfo> {
    const res = await axios.get<WorkspaceInfo>(`${BASE}/info`);
    return res.data;
}
