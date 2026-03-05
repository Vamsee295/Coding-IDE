import { apiClient, terminalClient } from '@/services/api';
import { Extension } from '@/types/extension';

export const extensionService = {
    /** Fetch all registered native extensions */
    async getAll(): Promise<Extension[]> {
        const response = await apiClient.get<Extension[]>('/extensions');
        return response.data;
    },

    /** Fetch all imported VS Code extensions */
    async getImported(): Promise<Extension[]> {
        try {
            const response = await terminalClient.get<Extension[]>('/vscode-extensions/imported');
            return response.data;
        } catch (e) {
            console.error('[ExtensionService] Failed to fetch imported extensions:', e);
            return [];
        }
    },

    /** Fetch detailed info for a VS Code extension */
    async getVSCodeDetails(id: string): Promise<any> {
        const response = await terminalClient.get(`/vscode-extensions/${id}/details`);
        return response.data;
    },

    /** Enable an extension by ID */
    async enable(id: string): Promise<Extension> {
        const response = await apiClient.post<Extension>(`/extensions/${id}/enable`);
        return response.data;
    },

    /** Disable an extension by ID */
    async disable(id: string): Promise<Extension> {
        const response = await apiClient.post<Extension>(`/extensions/${id}/disable`);
        return response.data;
    },

    /** Delete/Uninstall an imported extension */
    async uninstall(id: string): Promise<void> {
        await terminalClient.delete('/vscode-extensions/import', { data: { ids: [id] } });
    }
};
