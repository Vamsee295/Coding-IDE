import { create } from 'zustand';
import { FileItem, EditorTab, SidebarTab, Snapshot } from '@/react-app/types/ide';

interface IdeState {
  // Sidebar & Layout
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  chatPanelWidth: number;
  sidebarTab: SidebarTab;
  terminalVisible: boolean;
  terminalHeight: number;
  aiChatVisible: boolean;
  agentMode: boolean;

  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  setSidebarWidth: (width: number | ((prev: number) => number)) => void;
  setChatPanelWidth: (width: number | ((prev: number) => number)) => void;
  setSidebarTab: (tab: SidebarTab | ((prev: SidebarTab) => SidebarTab)) => void;
  setTerminalVisible: (visible: boolean | ((prev: boolean) => boolean)) => void;
  setTerminalHeight: (height: number | ((prev: number) => number)) => void;
  setAiChatVisible: (visible: boolean | ((prev: boolean) => boolean)) => void;
  setAgentMode: (enabled: boolean | ((prev: boolean) => boolean)) => void;

  // Projects & Files
  activeProjectId: string | null;
  activeProjectPath: string | undefined;
  activeFileId: string | null;
  files: FileItem[];
  tabs: EditorTab[];
  
  setActiveProjectId: (id: string | null) => void;
  setActiveProjectPath: (path: string | undefined) => void;
  setActiveFileId: (id: string | null) => void;
  setFiles: (files: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  setTabs: (tabs: EditorTab[] | ((prev: EditorTab[]) => EditorTab[])) => void;

  // Modals & Dialogs
  searchModalOpen: boolean;
  replaceModalOpen: boolean;
  showWelcomePage: boolean;
  showReleaseNotes: boolean;
  showKbShortcuts: boolean;

  setSearchModalOpen: (open: boolean) => void;
  setReplaceModalOpen: (open: boolean) => void;
  setShowWelcomePage: (open: boolean) => void;
  setShowReleaseNotes: (open: boolean) => void;
  setShowKbShortcuts: (open: boolean) => void;
  
  // Dialogs
  dialogState: {
    open: boolean;
    mode: "new-file" | "new-folder" | "rename" | "delete";
    item?: FileItem;
    parentId?: string;
  };
  setDialogState: (state: any) => void;

  snapshots: Snapshot[];
  setSnapshots: (snapshots: Snapshot[] | ((prev: Snapshot[]) => Snapshot[])) => void;
}

export const useIdeStore = create<IdeState>((set) => ({
  sidebarCollapsed: false,
  sidebarWidth: 256,
  chatPanelWidth: 320,
  sidebarTab: 'explorer',
  terminalVisible: true,
  terminalHeight: 250,
  aiChatVisible: true,
  agentMode: false,

  setSidebarCollapsed: (updater) => set((state) => ({
    sidebarCollapsed: typeof updater === 'function' ? (updater as any)(state.sidebarCollapsed) : updater
  })),
  setSidebarWidth: (updater) => set((state) => ({
    sidebarWidth: typeof updater === 'function' ? (updater as any)(state.sidebarWidth) : updater
  })),
  setChatPanelWidth: (updater) => set((state) => ({
    chatPanelWidth: typeof updater === 'function' ? (updater as any)(state.chatPanelWidth) : updater
  })),
  setSidebarTab: (updater) => set((state) => ({
    sidebarTab: typeof updater === 'function' ? (updater as any)(state.sidebarTab) : updater
  })),
  setTerminalVisible: (updater) => set((state) => ({
    terminalVisible: typeof updater === 'function' ? (updater as any)(state.terminalVisible) : updater
  })),
  setTerminalHeight: (updater) => set((state) => ({
    terminalHeight: typeof updater === 'function' ? (updater as any)(state.terminalHeight) : updater
  })),
  setAiChatVisible: (updater) => set((state) => ({
    aiChatVisible: typeof updater === 'function' ? (updater as any)(state.aiChatVisible) : updater
  })),
  setAgentMode: (updater) => set((state) => ({
    agentMode: typeof updater === 'function' ? (updater as any)(state.agentMode) : updater
  })),

  activeProjectId: null,
  activeProjectPath: undefined,
  activeFileId: null,
  files: [],
  tabs: [],

  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setActiveProjectPath: (path) => set({ activeProjectPath: path }),
  setActiveFileId: (id) => set({ activeFileId: id }),
  setFiles: (updater) => set((state) => ({ 
      files: typeof updater === 'function' ? updater(state.files) : updater 
  })),
  setTabs: (updater) => set((state) => ({
      tabs: typeof updater === 'function' ? updater(state.tabs) : updater
  })),

  searchModalOpen: false,
  replaceModalOpen: false,
  showWelcomePage: false,
  showReleaseNotes: false,
  showKbShortcuts: false,

  setSearchModalOpen: (open) => set({ searchModalOpen: open }),
  setReplaceModalOpen: (open) => set({ replaceModalOpen: open }),
  setShowWelcomePage: (open) => set({ showWelcomePage: open }),
  setShowReleaseNotes: (open) => set({ showReleaseNotes: open }),
  setShowKbShortcuts: (open) => set({ showKbShortcuts: open }),

  dialogState: {
    open: false,
    mode: "new-file",
  },
  setDialogState: (updater) => set((state) => ({
    dialogState: typeof updater === 'function' ? updater(state.dialogState) : updater
  })),

  snapshots: [],
  setSnapshots: (updater) => set((state) => ({
    snapshots: typeof updater === 'function' ? updater(state.snapshots) : updater
  }))
}));
