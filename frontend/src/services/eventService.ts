import { apiClient } from '@/services/api';

/**
 * Sends editor lifecycle events to the backend EventBus.
 * Extensions (formatter, linter, AI) react to these events.
 */
export const eventService = {
  fileOpen(payload: { path?: string; name?: string; language?: string }) {
    return apiClient.post('/events/file-open', payload);
  },

  /**
   * File save: send content; backend may return modified content (e.g. after format).
   * Returns { data: { content: string } }.
   */
  async fileSave(payload: { path?: string; name?: string; language?: string; content?: string }) {
    const res = await apiClient.post<{ content: string }>('/events/file-save', payload);
    return res.data;
  },

  editorChange(payload: { path?: string; name?: string; content?: string; language?: string }) {
    return apiClient.post('/events/editor-change', payload);
  },

  selectionChange(payload: {
    path?: string;
    name?: string;
    selectedText?: string;
    language?: string;
    startLine?: number;
    endLine?: number;
  }) {
    return apiClient.post('/events/selection-change', payload);
  },
};
