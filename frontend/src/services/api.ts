import axios from "axios";

import { CONFIG } from "@/react-app/lib/config";

const API_BASE_URL = CONFIG.API_BASE_URL;

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

export const terminalClient = axios.create({
    baseURL: CONFIG.TERMINAL_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// JWT interceptor — attaches token to all API requests when available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("ide-auth-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Projects ---

export const getProjects = async () => {
    const response = await apiClient.get("/projects");
    return response.data;
};

export const createProject = async (name: string, description: string = "") => {
    const response = await apiClient.post("/projects", { name, description });
    return response.data;
};

export const deleteProject = async (projectId: string) => {
    const response = await apiClient.delete(`/projects/${projectId}`);
    return response.data;
};

// --- Files ---

export const getProjectFiles = async (projectId: string) => {
    const response = await apiClient.get(`/projects/${projectId}/files`);
    return response.data;
};

export const createFile = async (
    projectId: string,
    name: string,
    type: "file" | "folder",
    parentId: string = "root",
    content: string = ""
) => {
    const response = await apiClient.post(`/projects/${projectId}/files`, {
        name,
        type,
        parentId,
        content,
    });
    return response.data;
};

export const updateFile = async (fileId: string, updates: { name?: string; content?: string }) => {
    const response = await apiClient.put(`/projects/files/${fileId}`, updates);
    return response.data;
};

export const deleteFile = async (fileId: string) => {
    const response = await apiClient.delete(`/projects/files/${fileId}`);
    return response.data;
};
