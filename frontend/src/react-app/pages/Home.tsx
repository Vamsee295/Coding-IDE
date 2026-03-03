import { useState, useCallback, useEffect, useRef } from "react";
import Navbar from "@/react-app/components/ide/Navbar";
import Sidebar from "@/react-app/components/ide/Sidebar";
import Editor from "@/react-app/components/ide/Editor";
import ChatPanel from "@/react-app/components/ide/ChatPanel";
import TerminalPanel, { TerminalPanelHandle } from "@/react-app/components/ide/TerminalPanel";
import FileOperationDialog from "@/react-app/components/ide/FileOperationDialog";
import SettingsView from "@/react-app/components/ide/SettingsView";
import { useSettings } from "@/react-app/contexts/SettingsContext";
import { useIdeCommandListener } from "@/react-app/contexts/IdeCommandContext";
import { FileItem, ChatMessage, EditorTab, AIAction } from "@/react-app/types/ide";
import { getProjects, getProjectFiles, createFile, updateFile, deleteFile } from "@/services/api";
import { buildTreeFromFiles } from "@/utils/fileSystemHelper";
import { fsService } from "@/services/fsService";
import { eventService } from "@/services/eventService";
import { commandService } from "@/services/commandService";
import { openWorkspace as openBackendWorkspace } from "@/services/workspaceService";
import { aiOrchestrator } from "@/services/aiOrchestrator";

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

// Helper to transform flat DB files into nested tree
const buildFileTree = (files: any[]): FileItem[] => {
  const map = new Map<string, FileItem>();
  const roots: FileItem[] = [];

  files.forEach((file) => {
    map.set(file.id, {
      id: file.id,
      name: file.name,
      type: file.type,
      content: file.content || "",
      children: file.type === "folder" ? [] : undefined,
    });
  });

  files.forEach((file) => {
    const node = map.get(file.id)!;
    if (file.parent) {
      const parentNode = map.get(file.parent.id);
      if (parentNode && parentNode.children) {
        parentNode.children.push(node);
      } else {
        roots.push(node); // Fallback if parent is missing
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
};

export default function HomePage() {
  const { settings, updateSettings, setIsSettingsOpen, setSettingsTab } = useSettings();
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm connected to your local Ollama instance running Qwen 2.5 Coder. How can I help you with your code today?",
      timestamp: new Date(),
    },
  ]);
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


  // Ref to the terminal panel — used to imperatively cd when a project is opened
  const terminalRef = useRef<TerminalPanelHandle>(null);

  // Load Projects and Files from Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Try to restore last active workspace from localStorage
        const lastWorkspace = localStorage.getItem("ide-last-active-workspace");
        if (lastWorkspace) {
          console.log("[Home] Restoring last active workspace:", lastWorkspace);
          await openWorkspacePath(lastWorkspace);
          return; // Skip project list loading if we restored a workspace
        }

        // 2. Fallback to Project List from DB
        const projects = await getProjects();
        if (projects.length > 0) {
          const defaultProject = projects[0];
          setActiveProjectId(defaultProject.id);

          const rawFiles = await getProjectFiles(defaultProject.id);
          setFiles(buildFileTree(rawFiles));

          if (defaultProject.rootPath) {
            setActiveProjectPath(defaultProject.rootPath);
            setInitialTerminalCwd(defaultProject.rootPath);
            openBackendWorkspace(defaultProject.rootPath).catch(() => { });
          }
        }
      } catch (error) {
        console.error("Failed to load backend data", error);
        // Fallback or error reporting UI could be shown here
      }
    };
    fetchData();
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
    setTabs((prev) => prev.map((t) => ({ ...t, isActive: t.id === tabId })));
  }, []);

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

  const handleContentChange = useCallback((tabId: string, content: string) => {
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

      const response = await fetch(`http://localhost:8081/api/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server Error ${response.status}: ${(errorData as any).error || response.statusText}`);
      }

      const data = await response.json();
      const rawResponse = data.response || "";

      // Parse Actions
      const actions = aiOrchestrator.parseActions(rawResponse);
      const cleanContent = aiOrchestrator.stripActions(rawResponse);

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: cleanContent || "I've processed your request.",
        timestamp: new Date(),
        actions: actions.length > 0 ? actions : undefined,
      };
      setMessages((prev) => [...prev, aiResponse]);
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

  const selectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSelectionChange = useCallback((payload: any) => {
    if (selectionDebounceRef.current) clearTimeout(selectionDebounceRef.current);
    selectionDebounceRef.current = setTimeout(() => {
      eventService.selectionChange(payload).catch(() => { });
      selectionDebounceRef.current = null;
    }, 300);
  }, []);

  const handleApplyAction = useCallback(async (action: AIAction) => {
    switch (action.type) {
      case "run_command":
        if (action.command && terminalRef.current) {
          setTerminalVisible(true);
          terminalRef.current.executeCommand(action.command);
        }
        break;
      case "write_file":
        if (action.path && action.content) {
          setFiles(prev => findAndUpdateFile(prev, `fs-${action.path}`, (f) => ({ ...f, content: action.content })));
          setTabs(prev => prev.map(t => t.path === action.path ? { ...t, content: action.content!, isDirty: true } : t));
          try {
            await fsService.writeFile(action.path, action.content);
          } catch (e) {
            console.error("Failed to apply file write", e);
          }
        }
        break;
      case "create_file":
        if (action.path && action.content) {
          try {
            await fsService.writeFile(action.path, action.content);
            const fileName = action.path.split(/[/\\]/).pop() || "new_file";
            const newFileItem: FileItem = {
              id: `fs-${action.path}`,
              name: fileName,
              type: "file",
              path: action.path,
              content: action.content
            };
            setFiles(prev => [...prev, newFileItem]);
          } catch (e) {
            console.error("Failed to create file", e);
          }
        }
        break;
    }
  }, [terminalRef, setTerminalVisible, findAndUpdateFile]);

  // Track Recent Workspaces & Persist Last Active
  useEffect(() => {
    if (activeProjectPath) {
      try {
        // Save as last active for restoration on reload
        localStorage.setItem("ide-last-active-workspace", activeProjectPath);

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
  useIdeCommandListener("view.explorer", () => setSidebarCollapsed((prev) => !prev));
  useIdeCommandListener("view.terminal", () => setTerminalVisible((prev) => !prev));
  useIdeCommandListener("view.toggleAiChat", () => setAiChatVisible((prev) => !prev));
  useIdeCommandListener("terminal.newTerminal", () => setTerminalVisible(true));
  useIdeCommandListener("terminal.newWithProfile", (profile: string) => {
    setTerminalVisible(true);
    // Let TerminalPanel handle the creation using the requested profile
    if (terminalRef.current) {
      terminalRef.current.openTerminalWithProfile(activeProjectPath || "X:\\Project-Buildings", profile);
    }
  });
  useIdeCommandListener("file.newFile", () => handleNewFile("root"));
  useIdeCommandListener("file.newTextFile", () => handleNewFile("root"));
  useIdeCommandListener("file.openFolder", async () => {
    try {
      const resp = await fetch("http://localhost:8082/pick-folder");
      const data = await resp.json();
      if (data.path) {
        await openWorkspacePath(data.path);
      }
    } catch (e) {
      console.error("Failed to call native folder picker from terminal server", e);
      // Fallback
      const defaultPath = localStorage.getItem("ide-last-active-workspace") || "X:\\Project-Buildings\\";
      const path = prompt("Enter the absolute path of the project folder:", defaultPath);
      if (path) {
        await openWorkspacePath(path);
      }
    }
  });

  const openWorkspacePath = async (path: string) => {
    try {
      const info = await fsService.checkExists(path);
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
        setInitialTerminalCwd(prev => prev ?? path);
        // Register on backend so terminal + project detector know the workspace
        openBackendWorkspace(path).catch(() => { });
        // Open a NEW terminal tab for this workspace and clear old ones
        if (initialTerminalCwd) {
          terminalRef.current?.resetForNewWorkspace(path);
        }
        setTerminalVisible(true);

      } else {
        alert("Invalid directory path.");
      }
    } catch (e) {
      console.error("Failed to open local path", e);
      alert("Error connecting to backend file system service.");
    }
  };

  useIdeCommandListener("file.openLocalPath", async () => {
    const path = prompt("Enter the absolute path of the project folder:", "X:\\Project-Buildings\\twitter-sentiment-analysis");
    if (!path) return;
    await openWorkspacePath(path);
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
    setSettingsTab("general");
    setIsSettingsOpen(true);
  });
  useIdeCommandListener("view.extensions", () => {
    setSettingsTab("extensions");
    setIsSettingsOpen(true);
  });
  useIdeCommandListener("help.about", () => {
    setSettingsTab("about");
    setIsSettingsOpen(true);
  });
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
    if (confirm("Are you sure you want to exit the IDE?")) {
      window.close();
      document.body.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100vh;background:#0f111a;color:#fff;font-family:sans-serif;'>IDE Closed. You can close this tab.</div>";
    }
  });

  return (
    <div className="h-screen flex flex-col bg-ide-bg overflow-hidden">
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
        <div className="flex-1 flex min-h-0">
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
          />
          {!sidebarCollapsed && (
            <div
              className="w-1 bg-transparent hover:bg-indigo-500/50 cursor-col-resize z-10 transition-colors active:bg-indigo-500 shrink-0 select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                setResizingPanel("sidebar");
              }}
            />
          )}
          <Editor
            tabs={tabs}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
            onSelectionChange={handleSelectionChange}
          />
          {aiChatVisible && (
            <>
              <div
                className="w-1 bg-transparent hover:bg-indigo-500/50 cursor-col-resize z-10 transition-colors active:bg-indigo-500 shrink-0 select-none"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setResizingPanel("chat");
                }}
              />
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
      <FileOperationDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        mode={dialogState.mode}
        initialValue={dialogState.mode === "rename" ? dialogState.item?.name : ""}
        itemName={dialogState.item?.name}
        onConfirm={handleDialogConfirm}
      />
    </div>
  );
}
