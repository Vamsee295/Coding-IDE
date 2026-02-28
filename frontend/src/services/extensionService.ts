import { apiClient } from '@/services/api';
import { Extension } from '@/types/extension';

export const extensionService = {
    /** Fetch all registered extensions */
    async getAll(): Promise<Extension[]> {
        const response = await apiClient.get<Extension[]>('/extensions');
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
};
