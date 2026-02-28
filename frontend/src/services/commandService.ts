import { apiClient } from '@/services/api';

/**
 * Execute IDE commands on the backend (e.g. runFile, formatter.formatDocument).
 * Returns { data: { result: string | object } }.
 */
export const commandService = {
  async execute<T = string>(commandName: string, payload: Record<string, unknown> = {}): Promise<T> {
    const res = await apiClient.post<{ result: T }>(`/commands/${commandName}`, payload);
    return res.data.result;
  },

  async runFile(payload: { path?: string; content?: string; language?: string }): Promise<string> {
    return this.execute<string>('runFile', payload);
  },
};
