import { useState, useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Navbar from "@/react-app/components/ide/Navbar";
import Sidebar from "@/react-app/components/ide/Sidebar";
import Editor from "@/react-app/components/ide/Editor";
import ChatPanel from "@/react-app/components/ide/ChatPanel";
import TerminalPanel, { TerminalPanelHandle } from "@/react-app/components/ide/TerminalPanel";
import FileOperationDialog from "@/react-app/components/ide/FileOperationDialog";
import SettingsView from "@/react-app/components/ide/SettingsView";
import { useSettings } from "@/react-app/contexts/SettingsContext";
import { useIdeCommandListener, useIdeCommand } from "@/react-app/contexts/IdeCommandContext";
import { FileItem, ChatMessage, EditorTab, AIAction, SidebarTab, Snapshot, ChatSession } from "@/react-app/types/ide";
import ChatHistoryModal from "@/react-app/components/ide/ChatHistoryModal";
import ReviewBar from "@/react-app/components/ide/ReviewBar";
import { createFile, updateFile, deleteFile } from "@/services/api";
import { buildTreeFromFiles } from "@/utils/fileSystemHelper";
import SearchModal from "@/react-app/components/ide/SearchModal";
import ReplaceModal from "@/react-app/components/ide/ReplaceModal";
import StatusBar from "@/react-app/components/ide/StatusBar";
import WelcomePage from "@/react-app/components/ide/WelcomePage";
import ReleaseNotesPage from "@/react-app/components/ide/ReleaseNotesPage";
import KeyboardShortcutsModal from "@/react-app/components/ide/KeyboardShortcutsModal";
import DebugToolbar from "@/react-app/components/ide/DebugToolbar";
import CommandPalette from "@/react-app/components/ide/CommandPalette";
import DiffPreviewModal from "@/react-app/components/ide/DiffPreviewModal";
import { debugService } from "@/services/debugService";
import { fsService } from "@/services/fsService";
import { eventService } from "@/services/eventService";
import { commandService } from "@/services/commandService";
import { openWorkspace as openBackendWorkspace, reindexWorkspace, searchContext, searchVectorContext, analyzeScreen } from "@/services/workspaceService";
import { cn } from "@/react-app/lib/utils";
import { aiOrchestrator } from "@/services/aiOrchestrator";
import { CONFIG } from "@/react-app/lib/config";

const getLanguage = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    java: "java",
    json: "json",
    md: "markdown",
    html: "html",
    css: "css",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    go: "go",
    rs: "rust",
    rust: "rust",
    rb: "ruby",
    php: "php",
    sh: "shell"
  };
  return map[ext ?? ""] ?? "plaintext";
};
// Dummy data removed, using dynamic loading from API


export default function HomePage() {
  const { settings, updateSettings, setIsSettingsOpen, setSettingsTab } = useSettings();
  const { dispatchCommand } = useIdeCommand();
  const fallbackFileInputRef = useRef<HTMLInputElement>(null);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [selectedModel, setSelectedModelState] = useState(settings.aiModel || "qwen2.5-coder:7b");

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
    updateSettings({ aiModel: model });
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [chatPanelWidth, setChatPanelWidth] = useState(320);
  const [resizingPanel, setResizingPanel] = useState<"sidebar" | "chat" | null>(null);

  const [diffPreviewState, setDiffPreviewState] = useState<{
    isOpen: boolean;
    action?: AIAction;
    fileName: string;
    originalContent: string;
    modifiedContent: string;
    messageId?: string;
  }>({
    isOpen: false,
    fileName: "",
    originalContent: "",
    modifiedContent: "",
  });

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [showWelcomePage, setShowWelcomePage] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showKbShortcuts, setShowKbShortcuts] = useState(false);
  // Navigation History for GO > Back/Forward
  const navHistoryRef = useRef<string[]>([]);
  const navHistoryIndexRef = useRef<number>(-1);
  const lastEditLocationRef = useRef<{ fileId: string; line: number } | null>(null);
  // Debug state
  const [debugActive, setDebugActive] = useState(false);
  const [debugPaused, setDebugPaused] = useState(false);
  const [statusBarLine, setStatusBarLine] = useState(1);
  const [statusBarCol, setStatusBarCol] = useState(1);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

  // Check backend connectivity
  useEffect(() => {
    const check = () => fetch(`${CONFIG.TERMINAL_API_URL}/health`).then(() => setIsBackendConnected(true)).catch(() => setIsBackendConnected(false));
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── File Watcher Socket ────────────────────────────────────────────────────
  const watcherSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(CONFIG.TERMINAL_WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    watcherSocketRef.current = socket;

    socket.on('fs-change', ({ events }: { events: Array<{ type: string; path: string; relativePath: string }> }) => {
      console.log('[FileWatcher] Received fs-change events:', events.length);
      // Find affected parent directories and refresh them
      const affectedDirs = new Set<string>();
      events.forEach(evt => {
        const parentDir = evt.path.substring(0, evt.path.lastIndexOf('\\')) || evt.path.substring(0, evt.path.lastIndexOf('/'));
        if (parentDir) affectedDirs.add(parentDir);
      });

      // Trigger a re-fetch of the file explorer tree for affected directories
      // by resetting children of matching folders to force lazy reload
      setFiles(prev => {
        if (!prev) return [];
        return refreshAffectedNodes(prev, affectedDirs);
      });
    });

    return () => {
      socket.disconnect();
      watcherSocketRef.current = null;
    };
  }, []);

  /** Recursively find folder nodes whose path is in `dirs` and reset their children to trigger lazy reload */
  function refreshAffectedNodes(items: FileItem[], dirs: Set<string>): FileItem[] {
    return items.map(item => {
      if (item.type === 'folder' && item.path && dirs.has(item.path)) {
        return { ...item, children: undefined }; // Reset to force lazy reload
      }
      if (item.children && item.children.length > 0) {
        return { ...item, children: refreshAffectedNodes(item.children, dirs) };
      }
      return item;
    });
  }


  useEffect(() => {
    if (!resizingPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingPanel === "sidebar") {
        const newWidth = Math.min(Math.max(e.clientX, 150), 600);
        setSidebarWidth(newWidth);
      } else if (resizingPanel === "chat") {
        const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 200), 800);
        setChatPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setResizingPanel(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingPanel]);

  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(Date.now().toString());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [reviewFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    mode: "new-file" | "new-folder" | "rename" | "delete";
    item?: FileItem;
    parentId?: string;
  }>({
    open: false,
    mode: "new-file",
  });
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [aiChatVisible, setAiChatVisible] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [activeProjectPath, setActiveProjectPath] = useState<string | undefined>(undefined);
  // Tracks the very first project path — passed as initialCwd to TerminalPanel once
  const [initialTerminalCwd, setInitialTerminalCwd] = useState<string | undefined>(undefined);
  // console.log("[Home] Rendered with initialTerminalCwd:", initialTerminalCwd);

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("explorer");
  // Load/Save Sessions
  useEffect(() => {
    const saved = localStorage.getItem("ide-chat-sessions");
    if (saved) {
      try { setSessions(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("ide-chat-sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  const toggleSidebarTab = useCallback((tab: SidebarTab) => {
    if (sidebarTab === tab) {
      setSidebarCollapsed((prev) => !prev);
    } else {
      setSidebarTab(tab);
      setSidebarCollapsed(false);
    }
  }, [sidebarTab]);

  useIdeCommandListener("view.explorer", () => toggleSidebarTab("explorer"));
  useIdeCommandListener("view.extensions", () => toggleSidebarTab("extensions"));
  useIdeCommandListener("view.scm", () => toggleSidebarTab("git"));
  useIdeCommandListener("view.debug", () => toggleSidebarTab("debug"));

  useIdeCommandListener("view.wordWrap", () => updateSettings({ wordWrap: !settings.wordWrap }));
  useIdeCommandListener("view.toggleActivityBar", () => updateSettings({ layoutActivityBarVisible: !settings.layoutActivityBarVisible }));
  useIdeCommandListener("view.toggleStatusBar", () => updateSettings({ layoutStatusBarVisible: !settings.layoutStatusBarVisible }));
  useIdeCommandListener("view.toggleZenMode", () => updateSettings({ zenMode: !settings.zenMode }));
  useIdeCommandListener("view.moveSidebarLeft", () => updateSettings({ layoutSidebarPosition: "left" }));
  useIdeCommandListener("view.moveSidebarRight", () => updateSettings({ layoutSidebarPosition: "right" }));


  // Ref to the terminal panel — used to imperatively cd when a project is opened
  const terminalRef = useRef<TerminalPanelHandle>(null);

  // On startup: do NOT auto-open the last workspace.
  // Only set the terminal's initial CWD to the user home directory.
  // The user must explicitly open a folder via WelcomePage or menu.
  useEffect(() => {
    const initTerminalCwd = async () => {
      try {
        const res = await fetch(`${CONFIG.TERMINAL_API_URL}/user-home`);
        const data = await res.json();
        if (data.path) {
          setInitialTerminalCwd(data.path);
        }
      } catch (e) {
        console.error("Failed to fetch user home for terminal fallback.", e);
      }
    };

    initTerminalCwd().catch(console.error);
  }, []);

  const getProjectContext = useCallback((items: FileItem[], depth = 0, currentCount = { val: 0 }): string => {
    if (depth > 3 || currentCount.val > 100) return "";
    let context = "";
    for (const item of items) {
      if (currentCount.val > 100) break;
      currentCount.val++;

      const indent = "  ".repeat(depth);
      context += `${indent}${item.type === "folder" ? "📁" : "📄"} ${item.name}${item.path ? ` (${item.path})` : ""}\n`;
      if (item.children) {
        context += getProjectContext(item.children, depth + 1, currentCount);
      }
    }
    return context;
  }, []);

  const findFileContent = (files: FileItem[], fileId: string): string | undefined => {
    for (const file of files) {
      if (file.id === fileId) return file.content;
      if (file.children) {
        const found = findFileContent(file.children, fileId);
        if (found) return found;
      }
    }
    return undefined;
  };

  const handleFileSelect = useCallback((file: FileItem) => {
    if (file.type === "folder") return;

    const openFile = async (item: FileItem) => {
      let content = item.content || "";

      // Determine the directory of the file (for terminal fallback)
      if (item.path && !activeProjectPath) {
        const fileDir = item.path.substring(0, item.path.lastIndexOf('\\')) || item.path.substring(0, item.path.lastIndexOf('/'));
        if (fileDir) {
          setInitialTerminalCwd(fileDir);
          // Also update the active terminal instance if it exists
          terminalRef.current?.resetForNewWorkspace(fileDir);
        }
      }

      // If server-side file and no content yet, fetch it
      if (item.path && !item.content) {
        try {
          content = await fsService.readFile(item.path);
          // Update the file in the files tree so we don't fetch it again
          setFiles(prev => findAndUpdateFile(prev, item.id, (f) => ({ ...f, content })));
        } catch (e) {
          console.error("Failed to read file from server", e);
        }
      }

      setActiveFileId(item.id);
      setTabs((prev) => {
        const existingTab = prev.find((t) => t.id === item.id);
        if (existingTab) {
          return prev.map((t) => ({ ...t, isActive: t.id === item.id }));
        }
        return [
          ...prev.map((t) => ({ ...t, isActive: false })),
          {
            id: item.id,
            name: item.name,
            language: "typescript",
            content: content,
            isActive: true,
            isDirty: false,
            path: item.path
          },
        ];
      });
    };

    openFile(file);
  }, []);

  const handleTabSelect = useCallback((tabId: string) => {
    setActiveFileId(tabId);
    setTabs((prev) => {
      // Push to navigation history
      navHistoryRef.current = [...navHistoryRef.current.slice(0, navHistoryIndexRef.current + 1), tabId];
      navHistoryIndexRef.current = navHistoryRef.current.length - 1;
      return prev.map((t) => ({ ...t, isActive: t.id === tabId }));
    });
  }, [navHistoryRef, navHistoryIndexRef]);

  const handleTabClose = useCallback((tabId: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (filtered.length > 0 && prev.find((t) => t.id === tabId)?.isActive) {
        filtered[filtered.length - 1].isActive = true;
        setActiveFileId(filtered[filtered.length - 1].id);
      } else if (filtered.length === 0) {
        setActiveFileId(null);
      }
      return filtered;
    });
  }, []);

  const handleTabRename = useCallback((tabId: string, newName: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, name: newName } : t))
    );
  }, []);

  const handleContentChange = useCallback((tabId: string, content: string) => {
    // Track last edit location for go.lastEditLocation
    const lineCount = content.split('\n').length;
    lastEditLocationRef.current = { fileId: tabId, line: lineCount };
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, content, isDirty: true } : t
      )
    );
  }, []);

  const handleSendMessage = useCallback(async (content: string, taggedFiles: FileItem[] = [], attachedImages: string[] = []) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
      attachedImages: attachedImages.length > 0 ? attachedImages : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const activeTab = tabs.find(t => t.isActive);
    let contextBlock = "";

    // 0. Add Project Tree Context
    contextBlock += "Project Structure:\n" + getProjectContext(files) + "\n\n";

    // 1. Add Active File Context if enabled
    if (settings.contextualAwareness && activeTab) {
      contextBlock += `Active File: "${activeTab.name}"\n\`\`\`${getLanguage(activeTab.name)}\n${activeTab.content}\n\`\`\`\n\n`;
    }

    // 2. Add Tagged Files Context
    if (taggedFiles.length > 0) {
      contextBlock += "Tagged Files Context:\n";
      for (const file of taggedFiles) {
        if (file.type === "file") {
          let fileContent = file.content;
          if (!fileContent && file.path) {
            try {
              fileContent = await fsService.readFile(file.path);
            } catch (e) {
              fileContent = "[Error reading file content]";
            }
          }
          contextBlock += `File: "${file.name}"\n\`\`\`${getLanguage(file.name)}\n${fileContent || "[Empty]"}\n\`\`\`\n\n`;
        } else {
          contextBlock += `Folder: "${file.name}" (Tagged for context)\n\n`;
        }
      }
    } else if (activeProjectPath) {
      // automated context builder (Cursor-style + Vector DB)
      try {
        // Try keyword search first
        const keywordResults = await searchContext(content, 2);
        // Try semantic vector search next
        const vectorResults = await searchVectorContext(content, 3);
        
        // Combine results, avoiding duplicates for better context
        const combinedResults = [...keywordResults];
        for (const v of vectorResults) {
            if (!combinedResults.some(k => k.path === v.path)) {
                combinedResults.push(v);
            }
        }

        if (combinedResults.length > 0) {
          contextBlock += "Project Context (Semantic Search):\n";
          for (const file of combinedResults) {
            contextBlock += `File: "${file.name}"\n\`\`\`${getLanguage(file.name)}\n${file.content}\n\`\`\`\n\n`;
          }
        }
      } catch (e) {
        console.error("Automated context search failed", e);
      }
    }

    // 3. Add AI Action Protocol System Prompt
    const systemPrompt = aiOrchestrator.getSystemPrompt();
    const finalPrompt = `${systemPrompt}\n\nContext Information:\n${contextBlock}\nUser Question: ${content}`;

    try {
      const requestPayload: any = {
        model: selectedModel,
        prompt: finalPrompt,
        ollamaEndpoint: settings.ollamaEndpoint
      };

      if (attachedImages && attachedImages.length > 0) {
        requestPayload.images = attachedImages.map(img => img.replace(/^data:image\/[a-z]+;base64,/, ''));
      }

      // Use the streaming endpoint for real-time token display
      const response = await fetch(`${CONFIG.API_BASE_URL}/ai/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server Error ${response.status}: ${(errorData as any).error || response.statusText}`);
      }

      // Create a placeholder assistant message and stream tokens into it
      const aiMsgId = (Date.now() + 1).toString();
      const placeholderMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, placeholderMsg]);

      // Read the NDJSON stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        let done = false;
        let buffer = "";

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            // Parse NDJSON lines
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const chunk = JSON.parse(line);
                if (chunk.response) {
                  fullResponse += chunk.response;
                  // Update the message content incrementally
                  setMessages(prev =>
                    prev.map(m => m.id === aiMsgId ? { ...m, content: fullResponse } : m)
                  );
                }
              } catch {
                // Skip unparseable chunks
              }
            }
          }
        }
      }

      // Parse AI actions from the completed response
      const actions = aiOrchestrator.parseActions(fullResponse);
      const cleanContent = aiOrchestrator.stripActions(fullResponse);

      setMessages(prev =>
        prev.map(m => m.id === aiMsgId ? {
          ...m,
          content: cleanContent || "I've processed your request.",
          actions: actions.length > 0 ? actions : undefined,
        } : m)
      );
    } catch (error: any) {
      console.error("AI Error:", error);
      const aiResponseError: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `**AI Error**: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponseError]);
    } finally {
      setIsLoading(false);
    }
  }, [settings.ollamaEndpoint, selectedModel, tabs, settings.contextualAwareness]);

  const handleActionClick = useCallback((action: "explain" | "fix" | "optimize") => {
    const activeTab = tabs.find((t) => t.isActive);
    if (!activeTab) return;

    const actionMessages = {
      explain: `Please explain this code:\n\n\`\`\`typescript\n${activeTab.content.slice(0, 500)}...\n\`\`\``,
      fix: `Please review and fix any issues in this code:\n\n\`\`\`typescript\n${activeTab.content.slice(0, 500)}...\n\`\`\``,
      optimize: `Please optimize this code for better performance:\n\n\`\`\`typescript\n${activeTab.content.slice(0, 500)}...\n\`\`\``,
    };

    handleSendMessage(actionMessages[action]);
  }, [tabs, handleSendMessage]);

  const handleAnalyzeScreen = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await analyzeScreen();
      if (result.success && result.text) {
        // Send a message with the screen content as context
        await handleSendMessage(
           `Analyze what's on my screen and help me. Screen output:\n\n${result.text}`,
           [],
           result.image ? [result.image] : []
        );
      } else if (!result.success) {
        const errorMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `**Screen Analysis Failed**: ${result.error || "Ensure Tesseract OCR is installed and the Python backend is running at http://localhost:5001."}`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (e: any) {
      console.error("Screen analysis failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [handleSendMessage]);



  // File operation helpers
  const findAndUpdateFile = useCallback((
    items: FileItem[],
    fileId: string,
    updateFn: (item: FileItem) => FileItem | null
  ): FileItem[] => {
    return items
      .map((item) => {
        if (item.id === fileId) {
          return updateFn(item);
        }
        if (item.children) {
          return { ...item, children: findAndUpdateFile(item.children, fileId, updateFn) };
        }
        return item;
      })
      .filter((item): item is FileItem => item !== null);
  }, []);

  const findParentAndAdd = useCallback((
    items: FileItem[],
    parentId: string,
    newItem: FileItem
  ): FileItem[] => {
    if (parentId === "root") {
      return [...items, newItem];
    }
    return items.map((item) => {
      if (item.id === parentId && item.type === "folder") {
        return {
          ...item,
          children: [...(item.children || []), newItem],
        };
      }
      if (item.children) {
        return { ...item, children: findParentAndAdd(item.children, parentId, newItem) };
      }
      return item;
    });
  }, []);

  // File operation handlers
  const handleNewFile = useCallback((parentId: string) => {
    setDialogState({ open: true, mode: "new-file", parentId });
  }, []);

  const handleNewFolder = useCallback((parentId: string) => {
    setDialogState({ open: true, mode: "new-folder", parentId });
  }, []);

  const handleRename = useCallback((item: FileItem) => {
    setDialogState({ open: true, mode: "rename", item });
  }, []);

  const handleDelete = useCallback((item: FileItem) => {
    setDialogState({ open: true, mode: "delete", item });
  }, []);

  const handleDuplicate = useCallback(async (item: FileItem) => {
    if (item.type === "folder" || !activeProjectId) return;

    try {
      const duplicateName = item.name.replace(/(\.[^.]+)$/, " copy$1");
      const duplicatedDb = await createFile(activeProjectId, duplicateName, "file", "root", item.content || "");

      const newLocalItem: FileItem = {
        ...item,
        id: duplicatedDb.id,
        name: duplicatedDb.name,
      };

      setFiles((prev) => {
        const addDuplicate = (items: FileItem[]): FileItem[] => {
          const result: FileItem[] = [];
          for (const curr of items) {
            result.push(curr);
            if (curr.id === item.id) {
              result.push(newLocalItem);
            } else if (curr.children) {
              curr.children = addDuplicate(curr.children);
            }
          }
          return result;
        };
        return addDuplicate(prev);
      });
    } catch (e) {
      console.error("Duplicate failed", e);
    }
  }, [activeProjectId]);

  const findItemById = useCallback((items: FileItem[], id: string): FileItem | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }, []);

  const handleDialogConfirm = useCallback(
    async (value: string) => {
      const { mode, item, parentId } = dialogState;

      const isLocal = !activeProjectId && !!activeProjectPath;
      if (!activeProjectId && !isLocal) return;

      const getLocalParentPath = () => {
        if (!parentId || parentId === "root") return activeProjectPath;
        const parentItem = findItemById(files, parentId);
        return parentItem?.path || activeProjectPath;
      };

      try {
        switch (mode) {
          case "new-file": {
            if (isLocal) {
              const parentPath = getLocalParentPath();
              const newPath = `${parentPath}\\${value}`.replace(/\\\\/g, '\\');
              await fsService.writeFile(newPath, "");
              const newFileItem: FileItem = {
                id: `fs-${newPath}`,
                name: value,
                type: "file",
                path: newPath,
                content: "",
              };
              setFiles((prev) => findParentAndAdd(prev, parentId || "root", newFileItem));
              handleFileSelect(newFileItem);
            } else {
              const newFile = await createFile(activeProjectId!, value, "file", parentId || "root");
              const newFileItem: FileItem = {
                id: newFile.id,
                name: newFile.name,
                type: newFile.type,
                content: newFile.content || "",
              };
              setFiles((prev) => findParentAndAdd(prev, parentId || "root", newFileItem));
              handleFileSelect(newFileItem);
            }
            break;
          }

          case "new-folder": {
            if (isLocal) {
              const parentPath = getLocalParentPath();
              const newPath = `${parentPath}\\${value}`.replace(/\\\\/g, '\\');
              await fsService.createFolder(newPath);
              const newFolderItem: FileItem = {
                id: `fs-${newPath}`,
                name: value,
                type: "folder",
                path: newPath,
                children: [],
              };
              setFiles((prev) => findParentAndAdd(prev, parentId || "root", newFolderItem));
            } else {
              const newFolder = await createFile(activeProjectId!, value, "folder", parentId || "root");
              const newFolderItem: FileItem = {
                id: newFolder.id,
                name: newFolder.name,
                type: newFolder.type,
                children: [],
              };
              setFiles((prev) => findParentAndAdd(prev, parentId || "root", newFolderItem));
            }
            break;
          }

          case "rename": {
            if (item) {
              if (isLocal && item.path) {
                // Determine parent path of the item to construct new path
                const parentPathMatch = item.path.match(/(.*)[\/\\][^\/\\]+$/);
                const parentPath = parentPathMatch ? parentPathMatch[1] : activeProjectPath;
                const newPath = `${parentPath}\\${value}`.replace(/\\\\/g, '\\');
                await fsService.renameItem(item.path, newPath);

                setFiles((prev) =>
                  findAndUpdateFile(prev, item.id, (f) => ({ ...f, name: value, path: newPath, id: `fs-${newPath}` }))
                );
                setTabs((prev) =>
                  prev.map((t) => (t.id === item.id ? { ...t, name: value, path: newPath, id: `fs-${newPath}` } : t))
                );
                if (activeFileId === item.id) {
                  setActiveFileId(`fs-${newPath}`);
                }
              } else {
                const updated = await updateFile(item.id, { name: value });
                setFiles((prev) =>
                  findAndUpdateFile(prev, item.id, (f) => ({ ...f, name: updated.name }))
                );
                setTabs((prev) =>
                  prev.map((t) => (t.id === item.id ? { ...t, name: updated.name } : t))
                );
              }
            }
            break;
          }

          case "delete": {
            if (item) {
              if (isLocal && item.path) {
                await fsService.deleteItem(item.path);
                setFiles((prev) => findAndUpdateFile(prev, item.id, () => null));
                setTabs((prev) => prev.filter((t) => t.id !== item.id));
                if (activeFileId === item.id) {
                  setActiveFileId(null);
                }
              } else {
                await deleteFile(item.id);
                setFiles((prev) => findAndUpdateFile(prev, item.id, () => null));
                setTabs((prev) => prev.filter((t) => t.id !== item.id));
                if (activeFileId === item.id) {
                  setActiveFileId(null);
                }
              }
            }
            break;
          }
        }
      } catch (error) {
        console.error("Failed to execute file operation on backend:", error);
      }
    },
    [dialogState, activeFileId, activeProjectId, activeProjectPath, files, handleFileSelect, findParentAndAdd, findAndUpdateFile, findItemById]
  );

  const handleFolderExpand = useCallback(async (item: FileItem) => {
    if (item.path && (!item.children || item.children.length === 0)) {
      try {
        const { items, truncated } = await fsService.listDirectory(item.path);
        const childItems: FileItem[] = items.map(c => ({
          id: `fs-${c.path}`,
          name: c.name,
          type: c.type,
          path: c.path,
          children: c.type === 'folder' ? [] : undefined
        }));

        setFiles(prev => findAndUpdateFile(prev, item.id, (f) => ({ ...f, children: childItems, truncated })));
      } catch (e) {
        console.error("Failed to expand folder", e);
      }
    }
  }, [findAndUpdateFile]);

  const handleSave = useCallback(async () => {
    const activeTab = tabs.find(t => t.isActive);
    if (!activeTab || !activeTab.isDirty) return;

    // If it's an untitled file (no path and not in a remote project), route to Save As
    if (!activeTab.path && !activeProjectId) {
      dispatchCommand("file.saveAs");
      return;
    }

    let contentToSave = activeTab.content;
    try {
      const res = await eventService.fileSave({
        path: activeTab.path ?? "",
        name: activeTab.name,
        language: getLanguage(activeTab.name),
        content: activeTab.content,
      });
      contentToSave = res.content || activeTab.content;
      if (contentToSave !== activeTab.content) {
        setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, content: contentToSave } : t));
      }
    } catch (_) { }

    if (activeTab.path) {
      try {
        await fsService.writeFile(activeTab.path, contentToSave);
        setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, isDirty: false } : t));
      } catch (e) {
        console.error("Failed to save file to server", e);
      }
    } else if (activeProjectId) {
      try {
        await updateFile(activeTab.id, { content: contentToSave });
        setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, isDirty: false } : t));
      } catch (e) { }
    }
  }, [tabs, activeProjectId]);

  const handleNewChat = useCallback(() => {
    if (messages.length > 0) {
      const newSession: ChatSession = {
        id: currentSessionId,
        title: messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? "..." : ""),
        messages: [...messages],
        timestamp: new Date()
      };
      setSessions(prev => [newSession, ...prev]);
    }
    setMessages([]);
    setCurrentSessionId(Date.now().toString());
  }, [messages, currentSessionId]);

  const handleViewHistory = useCallback(() => {
    setIsHistoryOpen(true);
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages);
      setCurrentSessionId(session.id);
    }
  }, [sessions]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const handleRevert = useCallback(async (messageId: string) => {
    const snapshot = snapshots.find(s => s.messageId === messageId);
    if (!snapshot) {
      alert("No snapshot found for this action.");
      return;
    }

    // Reverting the first file in the snapshot for now (multi-file revert needs more complex UI)
    const file = snapshot.files[0];
    if (file) {
      setDiffPreviewState({
        isOpen: true,
        fileName: file.path.split(/[/\\]/).pop() || file.path,
        originalContent: file.modifiedContent, // Swap for revert: current modified is "original"
        modifiedContent: file.originalContent, // Original is what we want back
        action: {
          type: "write_file",
          path: file.path,
          content: file.originalContent,
          isRevert: true // Flag to know we are reverting
        },
        messageId: messageId // Keep track of which message we are reverting
      });
    }
  }, [snapshots]);

  const selectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSelectionChange = useCallback((payload: any) => {
    // Update status bar cursor position
    if (payload?.startLine !== undefined) setStatusBarLine(payload.startLine);
    if (payload?.startLine !== undefined) setStatusBarCol(1); // Monaco col tracking
    if (selectionDebounceRef.current) clearTimeout(selectionDebounceRef.current);
    selectionDebounceRef.current = setTimeout(() => {
      eventService.selectionChange(payload).catch(() => { });
      selectionDebounceRef.current = null;
    }, 300);
  }, []);

  const confirmApplyAction = useCallback(async (editedContent?: string) => {
    const { action, messageId } = diffPreviewState;
    const modifiedContent = editedContent ?? diffPreviewState.modifiedContent;
    if (!action) return;

    setDiffPreviewState(prev => ({ ...prev, isOpen: false }));

    // Mark message status
    if (messageId) {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, applied: !action.isRevert };
        }
        return m;
      }));
    }

    // Create a snapshot before applying
    if (!action.isRevert) {
      const newSnapshot: Snapshot = {
        id: Date.now().toString(),
        timestamp: new Date(),
        messageId: messageId || "unknown",
        files: [{
          path: action.path || "",
          originalContent: diffPreviewState.originalContent,
          modifiedContent: modifiedContent
        }]
      };
      setSnapshots(prev => [...prev, newSnapshot]);
    }

    // ... rest of writing logic ...
    if (action.path) {
      // Resolve path
      const isAbsolute = /^[a-zA-Z]:[\\/]/.test(action.path);
      const targetPath = (isAbsolute || !activeProjectPath) ? action.path : `${activeProjectPath}\\${action.path}`.replace(/\\\\/g, '\\');

      try {
        await fsService.writeFile(targetPath, modifiedContent);
        setTabs(prev => prev.map(t => (t.path === targetPath || t.path === action.path) ? { ...t, content: modifiedContent, isDirty: false } : t));
        
        if (action.type === "create_file" && !action.isRevert) {
          const fileName = action.path.split(/[/\\]/).pop() || "new_file";
          const newFileItem: FileItem = {
            id: `fs-${targetPath}`,
            name: fileName,
            type: "file",
            path: targetPath,
            content: modifiedContent
          };
          setFiles(prev => [...prev, newFileItem]);
        } else {
          setFiles(prev => findAndUpdateFile(prev, `fs-${targetPath}`, (f) => ({ ...f, content: modifiedContent })));
        }
      } catch (e) {
        console.error("Failed to apply file changes", e);
      }
    }
  }, [diffPreviewState, findAndUpdateFile]);

  const handleApplyAction = useCallback(async (action: AIAction, messageId: string) => {
    // Resolve absolute path if necessary
    const isAbsolute = action.path && /^[a-zA-Z]:[\\/]/.test(action.path);
    const resolvedPath = (action.path && !isAbsolute && activeProjectPath) 
      ? `${activeProjectPath}\\${action.path}`.replace(/\\\\/g, '\\') 
      : action.path;

    switch (action.type) {
      case "run_command":
        if (action.command && terminalRef.current) {
          setTerminalVisible(true);
          terminalRef.current.executeCommand(action.command);
        }
        break;
      case "delete_file":
        if (resolvedPath) {
          try {
            await fsService.deleteItem(resolvedPath);
            setFiles(prev => prev.filter(f => f.path !== resolvedPath && f.id !== `fs-${resolvedPath}`));
            setTabs(prev => prev.filter(t => t.path !== resolvedPath));
          } catch (e) {
            console.error("Failed to delete file", e);
          }
        }
        break;
      case "rename_file":
        if (resolvedPath && action.newPath) {
          try {
            const isNewAbsolute = /^[a-zA-Z]:[\\/]/.test(action.newPath);
            const resolvedNewPath = (!isNewAbsolute && activeProjectPath)
              ? `${activeProjectPath}\\${action.newPath}`.replace(/\\\\/g, '\\')
              : action.newPath;

            const content = await fsService.readFile(resolvedPath);
            await fsService.writeFile(resolvedNewPath, content);
            await fsService.deleteItem(resolvedPath);
            const newName = action.newPath.split(/[/\\]/).pop() || action.newPath;
            setTabs(prev => prev.map(t => t.path === resolvedPath ? { ...t, path: resolvedNewPath, name: newName, id: `fs-${resolvedNewPath}` } : t));
            setFiles(prev => prev.map(f => f.path === resolvedPath ? { ...f, path: resolvedNewPath, name: newName, id: `fs-${resolvedNewPath}` } : f));
          } catch (e) {
            console.error("Failed to rename file", e);
          }
        }
        break;
      case "read_file":
        if (resolvedPath) {
          try {
            const content = await fsService.readFile(resolvedPath);
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: "assistant",
              content: `📄 **File content: \`${action.path}\`**\n\`\`\`\n${content}\n\`\`\``,
              timestamp: new Date(),
            }]);
          } catch (e) {
            console.error("Failed to read file for context", e);
          }
        }
        break;
      case "write_file":
      case "create_file":
      case "insert_at_line":
      case "replace_range":
        if (resolvedPath) {
          let originalContent = "";
          try {
            if (action.type !== "create_file") {
              const openTab = tabs.find(t => t.path === resolvedPath || t.path === action.path);
              if (openTab) {
                originalContent = openTab.content;
              } else {
                originalContent = await fsService.readFile(resolvedPath);
              }
            }
          } catch (e) { console.error("Could not read original file for diff", e); }

          let modifiedContent = originalContent;

          if (action.type === "write_file" || action.type === "create_file") {
            modifiedContent = action.content || "";
          } else if (action.type === "insert_at_line" && action.line !== undefined && action.content !== undefined) {
            const lines = originalContent.split('\n');
            lines.splice(action.line, 0, action.content);
            modifiedContent = lines.join('\n');
          } else if (action.type === "replace_range" && action.fromLine !== undefined && action.toLine !== undefined && action.content !== undefined) {
            const lines = originalContent.split('\n');
            lines.splice(action.fromLine - 1, action.toLine - action.fromLine + 1, action.content);
            modifiedContent = lines.join('\n');
          }

          const fileName = action.path?.split(/[/\\]/).pop() || action.path || "Unnamed File";
          
          setDiffPreviewState({
            isOpen: true,
            action: { ...action, path: resolvedPath }, // Use resolved path for action in state
            fileName,
            originalContent,
            modifiedContent,
            messageId
          });
        }
        break;
    }
  }, [terminalRef, setTerminalVisible, tabs, findAndUpdateFile, activeProjectPath]);



  // Track Recent Workspaces (history only — no auto-restore on startup)
  useEffect(() => {
    if (activeProjectPath) {
      try {
        const historyStr = localStorage.getItem("ide-recent-workspaces");
        let history: string[] = historyStr ? JSON.parse(historyStr) : [];
        // Remove if it exists and push to front
        history = history.filter(p => p !== activeProjectPath);
        history.unshift(activeProjectPath);
        // Keep only top 10
        if (history.length > 10) history = history.slice(0, 10);
        localStorage.setItem("ide-recent-workspaces", JSON.stringify(history));
      } catch (e) { }
    }
  }, [activeProjectPath]);

  // --- IDE Command Listeners ---
  useIdeCommandListener("go.switchEditor", () => {
    setTabs(prev => {
      if (prev.length <= 1) return prev;
      const activeIdx = prev.findIndex(t => t.isActive);
      const nextIdx = (activeIdx + 1) % prev.length;
      return prev.map((t, i) => ({ ...t, isActive: i === nextIdx }));
    });
  });
  useIdeCommandListener("go.switchGroup", () => {
    // Cycle to the next open tab (simulates group switching)
    setTabs(prev => {
      if (prev.length <= 1) return prev;
      const activeIdx = prev.findIndex(t => t.isActive);
      const nextIdx = (activeIdx + 1) % prev.length;
      const next = prev[nextIdx];
      // Push to nav history
      navHistoryRef.current = [...navHistoryRef.current.slice(0, navHistoryIndexRef.current + 1), next.id];
      navHistoryIndexRef.current++;
      return prev.map((t, i) => ({ ...t, isActive: i === nextIdx }));
    });
  });
  useIdeCommandListener("go.back", () => {
    if (navHistoryIndexRef.current <= 0) return;
    navHistoryIndexRef.current--;
    const targetId = navHistoryRef.current[navHistoryIndexRef.current];
    if (targetId) setTabs(prev => prev.map(t => ({ ...t, isActive: t.id === targetId })));
  });
  useIdeCommandListener("go.forward", () => {
    if (navHistoryIndexRef.current >= navHistoryRef.current.length - 1) return;
    navHistoryIndexRef.current++;
    const targetId = navHistoryRef.current[navHistoryIndexRef.current];
    if (targetId) setTabs(prev => prev.map(t => ({ ...t, isActive: t.id === targetId })));
  });
  useIdeCommandListener("go.lastEditLocation", () => {
    const loc = lastEditLocationRef.current;
    if (!loc) { alert("No recent edits tracked yet."); return; }
    setTabs(prev => prev.map(t => ({ ...t, isActive: t.id === loc.fileId })));
    // Tell Monaco to scroll to that line
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('ide:gotoLine', { detail: { line: loc.line } }));
    }, 100);
  });

  useIdeCommandListener("run.startDebugging", async () => {
    const activeTab = tabs.find(t => t.isActive);
    if (!activeTab?.path) { alert("Please open a file to debug first."); return; }
    const lang = activeTab.language || getLanguage(activeTab.name);
    setDebugActive(true);
    setDebugPaused(false);
    const unsub = debugService.onEvent(ev => {
      if (ev.type === 'stopped') setDebugPaused(true);
      if (ev.type === 'continued') setDebugPaused(false);
      if (ev.type === 'terminated') { setDebugActive(false); setDebugPaused(false); unsub(); }
      if (ev.type === 'error') { alert(`Debug error: ${ev.message}`); setDebugActive(false); unsub(); }
    });
    await debugService.launch({ language: lang, filePath: activeTab.path });
    toggleSidebarTab("debug");
  });
  useIdeCommandListener("run.runWithoutDebugging", () => {
    const activeTab = tabs.find(t => t.isActive);
    if (!activeTab?.path) return;
    terminalRef.current?.executeCommand(`node "${activeTab.path}"`);
    setTerminalVisible(true);
  });
  useIdeCommandListener("run.stopDebugging", () => { debugService.disconnect(); setDebugActive(false); setDebugPaused(false); });
  useIdeCommandListener("run.restartDebugging", async () => {
    debugService.disconnect();
    setDebugActive(false);
    const activeTab = tabs.find(t => t.isActive);
    if (!activeTab?.path) return;
    setTimeout(() => {
      const lang = activeTab.language || getLanguage(activeTab.name);
      debugService.launch({ language: lang, filePath: activeTab.path! });
      setDebugActive(true);
    }, 500);
  });
  useIdeCommandListener("run.openConfigurations", () => alert("launch.json configurations coming soon"));
  useIdeCommandListener("run.addConfiguration", () => alert("Add Configuration coming soon"));
  useIdeCommandListener("run.stepOver", () => { debugService.stepOver(); setDebugPaused(false); });
  useIdeCommandListener("run.stepInto", () => { debugService.stepInto(); setDebugPaused(false); });
  useIdeCommandListener("run.stepOut", () => { debugService.stepOut(); setDebugPaused(false); });
  useIdeCommandListener("run.continue", () => { debugService.continue(); setDebugPaused(false); });
  useIdeCommandListener("run.toggleBreakpoint", () => alert("Click gutter in Monaco editor to set breakpoints."));
  useIdeCommandListener("run.addConditionalBreakpoint", () => alert("Conditional breakpoints coming soon."));
  useIdeCommandListener("run.enableAllBreakpoints", () => alert("Enable All Breakpoints coming soon"));
  useIdeCommandListener("run.disableAllBreakpoints", () => alert("Disable All Breakpoints coming soon"));
  useIdeCommandListener("run.removeAllBreakpoints", () => alert("Remove All Breakpoints coming soon"));
  useIdeCommandListener("run.installDebuggers", () => alert("Install Debuggers coming soon"));

  useIdeCommandListener("view.terminal", () => setTerminalVisible((prev) => !prev));
  useIdeCommandListener("view.toggleAiChat", () => setAiChatVisible((prev) => !prev));
  useIdeCommandListener("terminal.newTerminal", () => setTerminalVisible(true));
  useIdeCommandListener("terminal.newWithProfile", (profile: string) => {
    setTerminalVisible(true);
    if (terminalRef.current) {
      terminalRef.current.openTerminalWithProfile(activeProjectPath || "C:\\", profile);
    }
  });
  useIdeCommandListener("terminal.splitTerminal", () => {
    setTerminalVisible(true);
    if (terminalRef.current) terminalRef.current.splitTerminal();
  });
  useIdeCommandListener("terminal.killTerminal", () => {
    if (terminalRef.current) terminalRef.current.killActiveTerminal();
  });
  useIdeCommandListener("terminal.clearTerminal", () => {
    if (terminalRef.current) terminalRef.current.clearActiveTerminal();
  });
  useIdeCommandListener("terminal.runTask", () => {
    setTerminalVisible(true);
    if (terminalRef.current) terminalRef.current.executeCommand("npm run "); // prepopulate
  });
  useIdeCommandListener("terminal.runActiveFile", () => {
    setTerminalVisible(true);
    const activeTab = tabs.find(t => t.isActive);
    if (activeTab && activeTab.path) {
      const lowerName = activeTab.name.toLowerCase();
      if (lowerName.endsWith('.js') || lowerName.endsWith('.ts')) {
        terminalRef.current?.executeCommand(`node "${activeTab.path}"`);
      } else if (lowerName.endsWith('.py')) {
        terminalRef.current?.executeCommand(`python "${activeTab.path}"`);
      } else {
        alert("Cannot determine execution runtime for " + activeTab.name);
      }
    } else {
      alert("No active file with a saved path to run.");
    }
  });
  useIdeCommandListener("file.newFile", () => handleNewFile("root"));
  useIdeCommandListener("file.newTextFile", () => {
    setTabs(prev => {
      // Find the highest untitled number
      const untitledNumbers = prev
        .filter(t => t.id.startsWith("untitled-"))
        .map(t => parseInt(t.id.replace("untitled-", ""), 10))
        .filter(n => !isNaN(n));
      const nextNum = untitledNumbers.length > 0 ? Math.max(...untitledNumbers) + 1 : 1;

      const newTabId = `untitled-${nextNum}`;
      const newTabName = `Untitled-${nextNum}`;
      setActiveFileId(newTabId);

      return [
        ...prev.map(t => ({ ...t, isActive: false })),
        {
          id: newTabId,
          name: newTabName,
          language: "plaintext",
          content: "",
          isActive: true,
          isDirty: true, // Mark as dirty immediately so it can be saved
        }
      ];
    });
  });
  useIdeCommandListener("file.openFolder", async () => {
    try {
      const resp = await fetch(`${CONFIG.TERMINAL_API_URL}/pick-folder`);
      const data = await resp.json();
      if (data.path) {
        await openWorkspacePath(data.path);
      }
    } catch (e) {
      console.error("Failed to call native folder picker from terminal server", e);
      alert("Terminal server is not running or failed to open folder picker. Please ensure the backend is active.");
    }
  });

  async function openWorkspacePath(path: string) {
    console.log("[Home] openWorkspacePath called with path:", path);
    try {
      const info = await fsService.checkExists(path);
      console.log("[Home] fsService.checkExists returned:", info);
      if (info.exists && info.isDirectory) {
        setFiles([{
          id: `root-${Date.now()}`,
          name: info.name,
          type: "folder",
          path: path,
          children: [] // Will lazy load
        }]);
        setActiveProjectId(null);
        setTabs([]);
        setActiveFileId(null);
        setActiveProjectPath(path);
        setInitialTerminalCwd(path);
        console.log("[Home] SUCCESS opening workspace. Path:", path, "initialTerminalCwd set to:", path);
        // Register on backend so terminal + project detector know the workspace
        openBackendWorkspace(path)
          .then(() => reindexWorkspace())
          .catch(() => { });
        // Start file watcher for this workspace
        watcherSocketRef.current?.emit('watch-workspace', { rootPath: path });
        // Open a NEW terminal tab for this workspace and clear old ones
        terminalRef.current?.resetForNewWorkspace(path);
        setTerminalVisible(true);

      } else {
        alert("Invalid directory path.");
      }
    } catch (e) {
      console.error("Failed to open local path", e);
      alert("Error connecting to backend file system service.");
    }
  };

  // Clone a remote Git repository into ~/cloned-repos and open it
  const handleCloneRepo = useCallback(async (repoUrl: string) => {
    try {
      const resp = await fetch(`${CONFIG.TERMINAL_API_URL}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Clone failed');
      // Open the cloned folder automatically
      await openWorkspacePath(data.path);
    } catch (e: any) {
      alert(`Clone failed: ${e.message}`);
    }
  }, []);

  useIdeCommandListener("file.openLocalPath", async () => {
    try {
      const resp = await fetch(`${CONFIG.TERMINAL_API_URL}/pick-folder`);
      const data = await resp.json();
      if (data.path) {
        await openWorkspacePath(data.path);
      }
    } catch (e) {
      console.error("Failed to call native folder picker from terminal server", e);
      alert("Terminal server is not running or failed to open folder picker.");
    }
  });

  useIdeCommandListener("file.openRecent", async (path: string) => {
    if (!path) return;
    await openWorkspacePath(path);
  });

  useIdeCommandListener("file.addFolderToWorkspace", async () => {
    const path = prompt("Enter the absolute path of the folder to add to workspace:");
    if (!path) return;

    try {
      const info = await fsService.checkExists(path);
      if (info.exists && info.isDirectory) {
        setFiles(prev => [
          ...prev,
          {
            id: `root-${Date.now()}`,
            name: info.name,
            type: "folder",
            path: path,
            children: [] // Will lazy load
          }
        ]);
      } else {
        alert("Invalid directory path.");
      }
    } catch (e) {
      console.error("Failed to add folder to workspace", e);
      alert("Error connecting to backend file system service.");
    }
  });

  const handleFallbackDirectorySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    const localFiles = await buildTreeFromFiles(filesList);
    if (localFiles) {
      setFiles(localFiles);
      setActiveProjectId(null);
      setTabs([]);
      setActiveFileId(null);
    }
  };
  useIdeCommandListener("file.preferences", () => {
    setSettingsTab("text-editor.general");
    setIsSettingsOpen(true);
  });
  useIdeCommandListener("view.extensions", () => {
    setSettingsTab("extensions");
    setIsSettingsOpen(true);
  });

  // -- Help Menu Actions --
  useIdeCommandListener("help.documentation", () => window.open("https://code.visualstudio.com/docs", "_blank"));
  useIdeCommandListener("help.welcome", () => setShowWelcomePage(true));
  useIdeCommandListener("help.releaseNotes", () => setShowReleaseNotes(true));
  useIdeCommandListener("help.keyboardShortcuts", () => setShowKbShortcuts(true));
  useIdeCommandListener("help.videoTutorials", () => window.open("https://code.visualstudio.com/docs/getstarted/introvideos", "_blank"));
  useIdeCommandListener("help.reportIssue", () => window.open("https://github.com/microsoft/vscode/issues/new/choose", "_blank"));
  useIdeCommandListener("help.searchFeatureRequests", () => window.open("https://github.com/microsoft/vscode/issues", "_blank"));
  useIdeCommandListener("help.viewLicense", () => alert("MIT License"));
  useIdeCommandListener("help.privacyStatement", () => window.open("https://privacy.microsoft.com/en-us/privacystatement", "_blank"));
  useIdeCommandListener("help.toggleDevTools", () => alert("Press F12 to open Developer Tools in your browser."));
  useIdeCommandListener("help.about", () => {
    setSettingsTab("application.updates");
    setIsSettingsOpen(true);
    alert("Ollama IDE v1.0.0\nArchitecture: Web Client (React) + Node.js Backend\nLocal AI Code Editor");
  });
  useIdeCommandListener("help.showCommands", () => dispatchCommand("view.commandPalette"));
  useIdeCommandListener("help.playground", () => alert("Interactive Playground coming soon."));
  useIdeCommandListener("help.walkthrough", () => alert("Walkthroughs coming soon."));
  useIdeCommandListener("help.processExplorer", () => alert("Process Explorer coming soon."));
  useIdeCommandListener("help.checkUpdates", () => alert("You are on the latest version!"));

  useIdeCommandListener("view.wordWrap", () => updateSettings({ wordWrap: !settings.wordWrap }));
  useIdeCommandListener("file.closeEditor", () => {
    if (activeFileId) handleTabClose(activeFileId);
  });
  useIdeCommandListener("file.save", handleSave);
  useIdeCommandListener("terminal.runActiveFile", async () => {
    const activeTab = tabs.find(t => t.isActive);
    if (!activeTab) return;
    try {
      const output = await commandService.runFile({
        path: activeTab.path,
        content: activeTab.content,
        language: getLanguage(activeTab.name),
      });
      if (output) alert("Run output:\n\n" + output);
    } catch (e: unknown) {
      alert("Run failed: " + (e instanceof Error ? e.message : "Check backend and Code Runner extension."));
    }
  });
  useIdeCommandListener("run.runWithoutDebugging", async () => {
    const activeTab = tabs.find(t => t.isActive);
    if (!activeTab) return;
    try {
      const output = await commandService.runFile({
        path: activeTab.path,
        content: activeTab.content,
        language: getLanguage(activeTab.name),
      });
      if (output) alert("Run output:\n\n" + output);
    } catch (e: unknown) {
      alert("Run failed: " + (e instanceof Error ? e.message : "Check backend and Code Runner extension."));
    }
  });
  useIdeCommandListener("file.saveAll", async () => {
    const dirtyTabs = tabs.filter(t => t.isDirty);
    for (const tab of dirtyTabs) {
      if (tab.path) {
        try {
          await fsService.writeFile(tab.path, tab.content);
          setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isDirty: false } : t));
        } catch (e) {
          console.error("Failed to save file", e);
        }
      }
    }
  });

  useIdeCommandListener("file.revertFile", async () => {
    const activeTab = tabs.find(t => t.isActive);
    if (!activeTab || !activeTab.isDirty) return;

    if (activeTab.path) {
      try {
        const originalContent = await fsService.readFile(activeTab.path);
        setTabs(prev => prev.map(t =>
          t.id === activeTab.id ? { ...t, content: originalContent, isDirty: false } : t
        ));
      } catch (e) {
        console.error("Failed to revert file", e);
      }
    }
  });

  useIdeCommandListener("edit.findInFiles", () => {
    if (activeProjectPath) {
      setSearchModalOpen(true);
    } else {
      alert("Please open a project folder first to search files.");
    }
  });

  useIdeCommandListener("edit.replaceInFiles", () => {
    if (activeProjectPath) {
      setReplaceModalOpen(true);
    } else {
      alert("Please open a project folder first to use Replace in Files.");
    }
  });

  useIdeCommandListener("file.newWindow", () => {
    window.open(window.location.href, "_blank");
  });

  useIdeCommandListener("file.saveAs", async () => {
    const activeTab = tabs.find(t => t.isActive);
    if (!activeTab) return;

    const defaultPath = activeTab.path || (activeProjectPath ? `${activeProjectPath}\\new-file.txt` : "X:\\Project-Buildings\\new-file.txt");
    const newPath = prompt("Enter the absolute path to save the new file:", defaultPath);
    if (!newPath) return;

    try {
      await fsService.writeFile(newPath, activeTab.content);

      // Update the active tab to point to the new path
      const fileName = newPath.split(/[/\\]/).pop() || "new_file";
      setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, path: newPath, name: fileName, isDirty: false } : t));

      // Reload the workspace files to show the newly saved file in the sidebar if it's within the project path
      if (activeProjectPath && newPath.startsWith(activeProjectPath)) {
        openWorkspacePath(activeProjectPath); // Re-fetch the tree
      } else {
        alert("File saved successfully.");
      }
    } catch (e) {
      console.error("Failed to Save As", e);
      alert("Failed to save the file. Check the path and permissions.");
    }
  });

  useIdeCommandListener("file.closeFolder", () => {
    setActiveProjectId(null);
    setFiles([]);
    setTabs([]);
    setActiveFileId(null);
    setActiveProjectPath(undefined);
    setInitialTerminalCwd(undefined);
    // Optionally close the terminal completely or let it sit idle.
    setTerminalVisible(false);
    localStorage.removeItem("ide-last-active-workspace");
  });

  useIdeCommandListener("file.closeWindow", () => {
    if (confirm("Are you sure you want to close this window?")) {
      window.close();
    }
  });

  useIdeCommandListener("file.autoSave", () => {
    updateSettings({ autoSave: !settings.autoSave });
  });

  // Auto Save Implementation
  useEffect(() => {
    if (!settings.autoSave) return;
    const interval = setInterval(() => {
      const dirtyTabs = tabs.filter(t => t.isDirty);
      dirtyTabs.forEach(async (tab) => {
        if (tab.path) {
          try {
            await eventService.fileSave({
              path: tab.path,
              name: tab.name,
              language: getLanguage(tab.name),
              content: tab.content,
            });
            await fsService.writeFile(tab.path, tab.content);
            setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isDirty: false } : t));
          } catch (e) {
            console.error("Auto-save failed for", tab.name, e);
          }
        } else if (activeProjectId) {
          try {
            await updateFile(tab.id, { content: tab.content });
            setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isDirty: false } : t));
          } catch (e) { }
        }
      });
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [settings.autoSave, tabs, activeProjectId]);

  useIdeCommandListener("file.exit", () => {
    if (confirm("Are you sure you want to close the current project?")) {
      setActiveProjectId(null);
      setFiles([]);
      setTabs([]);
      setActiveFileId(null);
      setActiveProjectPath(undefined);
      setInitialTerminalCwd(undefined);
      setTerminalVisible(true);
      localStorage.removeItem("ide-last-active-workspace");
    }
  });

  return (
    <div className="h-screen flex flex-col bg-ide-bg overflow-hidden">
      <DiffPreviewModal
        isOpen={diffPreviewState.isOpen}
        fileName={diffPreviewState.fileName}
        originalContent={diffPreviewState.originalContent}
        modifiedContent={diffPreviewState.modifiedContent}
        onAccept={confirmApplyAction}
        onCancel={() => setDiffPreviewState(prev => ({ ...prev, isOpen: false }))}
      />
      <input
        type="file"
        ref={fallbackFileInputRef}
        style={{ display: 'none' }}
        // @ts-ignore
        webkitdirectory=""
        // @ts-ignore
        directory=""
        multiple
        onChange={handleFallbackDirectorySelect}
      />
      <SettingsView />
      <Navbar
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <div className={cn(
          "flex-1 flex min-h-0 relative",
          settings.layoutSidebarPosition === 'right' && "flex-row-reverse"
        )}>
          {!settings.zenMode && (
            <Sidebar
            files={files}
            activeFileId={activeFileId}
            onFileSelect={handleFileSelect}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onNewFile={handleNewFile}
            onNewFolder={handleNewFolder}
            onRename={handleRename}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onFolderExpand={handleFolderExpand}
            width={sidebarWidth}
            isResizing={resizingPanel === "sidebar"}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            rootPath={activeProjectPath}
          />
          )}
          {!settings.zenMode && !sidebarCollapsed && (
            <div
              className="w-1 bg-transparent hover:bg-indigo-500/50 cursor-col-resize z-10 transition-colors active:bg-indigo-500 shrink-0 select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                setResizingPanel("sidebar");
              }}
            />
          )}
          <div className="flex-1 flex flex-col min-h-0 relative">
            <Editor
              tabs={tabs}
              onTabSelect={handleTabSelect}
              onTabClose={handleTabClose}
              onContentChange={handleContentChange}
              onTabRename={handleTabRename}
              onSelectionChange={handleSelectionChange}
            />
            {/* Debug Toolbar overlay */}
            {debugActive && (
              <div className="absolute top-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
                <div className="pointer-events-auto">
                  <DebugToolbar
                    isActive={debugActive}
                    isPaused={debugPaused}
                    onContinue={() => { debugService.continue(); setDebugPaused(false); }}
                    onStepOver={() => { debugService.stepOver(); setDebugPaused(false); }}
                    onStepInto={() => { debugService.stepInto(); setDebugPaused(false); }}
                    onStepOut={() => { debugService.stepOut(); setDebugPaused(false); }}
                    onPause={() => debugService.pause()}
                    onStop={() => { debugService.disconnect(); setDebugActive(false); setDebugPaused(false); }}
                    onRestart={() => {
                      debugService.disconnect();
                      setDebugActive(false);
                      const activeTab = tabs.find(t => t.isActive);
                      if (activeTab?.path) {
                        setTimeout(() => {
                          debugService.launch({ language: activeTab.language || getLanguage(activeTab.name), filePath: activeTab.path! });
                          setDebugActive(true);
                        }, 500);
                      }
                    }}
                  />
                </div>
              </div>
            )}
            {/* Welcome Page overlay — shown when no folder is open OR via Help > Welcome */}
            {(showWelcomePage || !activeProjectPath) && (
              <div className="absolute inset-0 z-20 flex bg-ide-bg">
                <div className="flex-1 relative">
                  {showWelcomePage && activeProjectPath && (
                    <button
                      onClick={() => setShowWelcomePage(false)}
                      className="absolute top-3 right-4 z-10 text-ide-text-secondary hover:text-white text-sm bg-ide-sidebar px-3 py-1 rounded border border-ide-border"
                    >✕ Close</button>
                  )}
                  <WelcomePage
                    recentWorkspaces={JSON.parse(localStorage.getItem('ide-recent-workspaces') || '[]')}
                    onOpenFolder={() => { setShowWelcomePage(false); dispatchCommand('file.openFolder'); }}
                    onNewFile={() => { setShowWelcomePage(false); dispatchCommand('file.newTextFile'); }}
                    onOpenFile={async (path) => { setShowWelcomePage(false); await openWorkspacePath(path); }}
                    onOpenCommandPalette={() => { setShowWelcomePage(false); dispatchCommand('view.commandPalette'); }}
                    onCloneRepo={async (url: string) => { setShowWelcomePage(false); await handleCloneRepo(url); }}
                  />
                </div>
              </div>
            )}
            {/* Release Notes overlay */}
            {showReleaseNotes && (
              <div className="absolute inset-0 z-20 flex bg-ide-bg">
                <div className="flex-1 relative">
                  <button
                    onClick={() => setShowReleaseNotes(false)}
                    className="absolute top-3 right-4 z-10 text-ide-text-secondary hover:text-white text-sm bg-ide-sidebar px-3 py-1 rounded border border-ide-border"
                  >✕ Close</button>
                  <ReleaseNotesPage />
                </div>
              </div>
            )}
          </div>
          {aiChatVisible && (
            <>
              <div
                className="w-2 cursor-col-resize z-20 shrink-0 select-none relative group mx-[-4px]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setResizingPanel("chat");
                }}
              >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-ide-border group-hover:bg-indigo-500 group-active:bg-indigo-500 transition-colors" />
              </div>
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                onActionClick={handleActionClick}
                onApplyAction={handleApplyAction}
                isLoading={isLoading}
                selectedModel={selectedModel}
                files={files}
                width={chatPanelWidth}
                isResizing={resizingPanel === "chat"}
                onNewChat={handleNewChat}
                onViewHistory={handleViewHistory}
                onRevert={handleRevert}
                onAnalyzeScreen={handleAnalyzeScreen}
              />
            </>
          )}
        </div>
        <TerminalPanel
          ref={terminalRef}
          isVisible={terminalVisible}
          onClose={() => setTerminalVisible(false)}
          height={terminalHeight}
          onHeightChange={setTerminalHeight}
          initialCwd={initialTerminalCwd}
        />
      </div>
      {/* Status Bar */}
      {settings.layoutStatusBarVisible && !settings.zenMode && (
        <StatusBar
          language={tabs.find(t => t.isActive)?.language || getLanguage(tabs.find(t => t.isActive)?.name || '')}
          line={statusBarLine}
          column={statusBarCol}
          isDirty={tabs.find(t => t.isActive)?.isDirty || false}
          isConnected={isBackendConnected}
        />
      )}
      <FileOperationDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        mode={dialogState.mode}
        initialValue={dialogState.mode === "rename" ? dialogState.item?.name : ""}
        itemName={dialogState.item?.name}
        onConfirm={handleDialogConfirm}
      />
      {activeProjectPath && (
        <SearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          rootPath={activeProjectPath}
          onOpenFile={async (path, _line) => {
            await handleFileSelect({ path, type: 'file', id: path, name: path.split(/[/\\]/).pop() || 'Unknown' });
          }}
        />
      )}
      {activeProjectPath && (
        <ReplaceModal
          isOpen={replaceModalOpen}
          onClose={() => setReplaceModalOpen(false)}
          rootPath={activeProjectPath}
          onOpenFile={async (path, _line) => {
            await handleFileSelect({ path, type: 'file', id: path, name: path.split(/[/\\]/).pop() || 'Unknown' });
          }}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKbShortcuts}
        onClose={() => setShowKbShortcuts(false)}
      />
      <CommandPalette
        files={files}
        onOpenFile={handleFileSelect}
      />
      
      {/* New AI Components */}
      <ChatHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />
      
      <ReviewBar
        isOpen={pendingReview}
        files={reviewFiles}
        onAcceptAll={() => setPendingReview(false)}
        onRejectAll={() => {
          setPendingReview(false);
          if (reviewFiles[0]) handleRevert(reviewFiles[0].path);
        }}
        onModify={() => setPendingReview(false)}
        onExplain={() => alert("Explaining changes...")}
        onFileClick={(path) => alert(`Inspecting ${path}`)}
      />
    </div>
  );
}
