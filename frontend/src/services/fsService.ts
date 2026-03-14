import axios from 'axios';

import { CONFIG } from '@/react-app/lib/config';

const API_BASE_URL = `${CONFIG.API_BASE_URL}/fs`;

export interface FileSystemItem {
    name: string;
    path: string;
    type: 'file' | 'folder';
    size: number;
    lastModified: number;
}

export const fsService = {
    /**
     * Check if a path exists and is a directory
     */
    async checkExists(path: string): Promise<{ exists: boolean; isDirectory: boolean; name: string }> {
        const response = await axios.get(`${API_BASE_URL}/exists`, { params: { path } });
        return response.data;
    },

    /**
     * List contents of a directory (shallow)
     */
    async listDirectory(path: string): Promise<{ items: FileSystemItem[], truncated: boolean, totalCount?: number }> {
        const response = await axios.get(`${API_BASE_URL}/list`, { params: { path } });
        return response.data;
    },

    /**
     * Read file content
     */
    async readFile(path: string): Promise<string> {
        const response = await axios.get(`${API_BASE_URL}/read`, { params: { path } });
        return response.data;
    },

    /**
     * Write file content
     */
    async writeFile(path: string, content: string): Promise<string> {
        const response = await axios.post(`${API_BASE_URL}/write`, { path, content });
        return response.data;
    },

    /**
     * Create folder
     */
    async createFolder(path: string): Promise<string> {
        const response = await axios.post(`${API_BASE_URL}/createFolder`, { path });
        return response.data;
    },

    /**
     * Delete item
     */
    async deleteItem(path: string): Promise<string> {
        const response = await axios.delete(`${API_BASE_URL}/delete`, { params: { path } });
        return response.data;
    },

    /**
     * Rename item
     */
    async renameItem(oldPath: string, newPath: string): Promise<string> {
        const response = await axios.post(`${API_BASE_URL}/rename`, { oldPath, newPath });
        return response.data;
    },

    /**
     * Search files content (supports optional regex mode)
     */
    async search(query: string, rootPath: string, regex: boolean = false): Promise<Array<{ path: string, line: number, content: string }>> {
        const response = await axios.get(`${API_BASE_URL}/search`, { params: { query, rootPath, regex } });
        return response.data;
    }
};
