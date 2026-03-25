import { create } from 'zustand';
import { ChatMessage, ChatSession } from '@/react-app/types/ide';
import { AgentMode } from '@/services/aiOrchestrator';
import { CONFIG } from '@/react-app/lib/config';

interface ChatState {
  messages: ChatMessage[];
  sessions: ChatSession[];
  currentSessionId: string;
  isHistoryOpen: boolean;
  isLoading: boolean;
  agentMode: AgentMode;
  availableModels: { label: string, value: string }[];

  // Actions
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setSessions: (sessions: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => void;
  setCurrentSessionId: (id: string) => void;
  setIsHistoryOpen: (open: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setAgentMode: (mode: AgentMode) => void;
  
  // High-level Actions for History
  newChat: () => void;
  loadChat: (projectPath: string, date: string, chatId: string) => Promise<void>;
  saveChat: (projectPath: string) => Promise<void>;
  deleteChat: (projectPath: string, date: string, chatId: string) => Promise<void>;
  renameChat: (projectPath: string, date: string, chatId: string, newTitle: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessions: [],
  currentSessionId: Date.now().toString(),
  isHistoryOpen: false,
  isLoading: false,
  agentMode: 'default',
  availableModels: [
      { label: 'Qwen 2.5 Coder 7B', value: 'qwen2.5-coder:7b' },
      { label: 'DeepSeek Coder 6.7B', value: 'deepseek-coder:6.7b' },
      { label: 'Mistral 7B', value: 'mistral:7b' }
  ],

  setMessages: (updater) => set((state) => ({
      messages: typeof updater === 'function' ? updater(state.messages) : updater
  })),
  setSessions: (updater) => set((state) => ({
      sessions: typeof updater === 'function' ? updater(state.sessions) : updater
  })),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setIsHistoryOpen: (open) => set({ isHistoryOpen: open }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setAgentMode: (mode) => set({ agentMode: mode }),

  newChat: () => {
    set({
        messages: [],
        currentSessionId: Date.now().toString(),
        isHistoryOpen: false
    });
  },

  loadChat: async (projectPath, date, chatId) => {
    set({ isLoading: true });
    try {
        const res = await fetch(`${CONFIG.TERMINAL_SERVER_URL}/api/chat/history/chat?projectPath=${encodeURIComponent(projectPath)}&date=${date}&id=${chatId}`);
        if (res.ok) {
            const data = await res.json();
            set({
                currentSessionId: chatId,
                messages: (data.messages || []).map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                })),
                isHistoryOpen: false
            });
        }
    } catch (e) {
        console.error("Failed to load chat", e);
    } finally {
        set({ isLoading: false });
    }
  },

  saveChat: async (projectPath) => {
    const { messages, currentSessionId } = get();
    if (!projectPath || !currentSessionId || messages.length === 0) return;

    try {
        await fetch(`${CONFIG.TERMINAL_SERVER_URL}/api/chat/history/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                projectPath,
                chatId: currentSessionId,
                messageJson: JSON.stringify({
                    id: currentSessionId,
                    title: messages[0]?.content.substring(0, 40) || "New Chat",
                    createdAt: messages[0]?.timestamp || new Date(),
                    updatedAt: new Date(),
                    messages: messages
                })
            })
        });
    } catch (e) {
        console.error("Auto-save failed", e);
    }
  },

  deleteChat: async (projectPath, date, chatId) => {
    try {
        const res = await fetch(`${CONFIG.TERMINAL_SERVER_URL}/api/chat/history/delete?projectPath=${encodeURIComponent(projectPath)}&date=${date}&id=${chatId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            // If current chat was deleted, start a new one
            if (get().currentSessionId === chatId) {
                get().newChat();
            }
        }
    } catch (e) {
        console.error("Delete failed", e);
    }
  },

  renameChat: async (projectPath, date, chatId, newTitle) => {
    try {
        await fetch(`${CONFIG.TERMINAL_SERVER_URL}/api/chat/history/rename`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                projectPath,
                date,
                id: chatId,
                newTitle
            })
        });
    } catch (e) {
        console.error("Rename failed", e);
    }
  }
}));
