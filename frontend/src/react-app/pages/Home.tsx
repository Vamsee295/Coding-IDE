import { useState, useCallback } from "react";
import Navbar from "@/react-app/components/ide/Navbar";
import Sidebar from "@/react-app/components/ide/Sidebar";
import Editor from "@/react-app/components/ide/Editor";
import ChatPanel from "@/react-app/components/ide/ChatPanel";
import TerminalPanel from "@/react-app/components/ide/TerminalPanel";
import FileOperationDialog from "@/react-app/components/ide/FileOperationDialog";
import SettingsView from "@/react-app/components/ide/SettingsView";
import { useSettings } from "@/react-app/contexts/SettingsContext";
import { useIdeCommandListener } from "@/react-app/contexts/IdeCommandContext";
import { FileItem, ChatMessage, EditorTab } from "@/react-app/types/ide";
import { getProjects, getProjectFiles, createFile, updateFile, deleteFile } from "@/services/api";
import { openLocalDirectory, buildTreeFromFiles } from "@/utils/fileSystemHelper";
import { useEffect, useRef } from "react";
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
  const { settings, updateSettings, setIsSettingsOpen } = useSettings();
  const fallbackFileInputRef = useRef<HTMLInputElement>(null);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [selectedModel, setSelectedModel] = useState("qwen2.5-coder:7b");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [terminalHeight, setTerminalHeight] = useState(250);

  // Load Projects and Files from Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const projects = await getProjects();
        if (projects.length > 0) {
          const defaultProject = projects[0];
          setActiveProjectId(defaultProject.id);

          const rawFiles = await getProjectFiles(defaultProject.id);
          setFiles(buildFileTree(rawFiles));
        } else {
          // If no projects, maybe create a default one (Optional)
          // const newProject = await createProject("Default Project");
          // setActiveProjectId(newProject.id);
        }
      } catch (error) {
        console.error("Failed to load backend data", error);
        // Fallback or error reporting UI could be shown here
      }
    };
    fetchData();
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

    setActiveFileId(file.id);

    setTabs((prev) => {
      const existingTab = prev.find((t) => t.id === file.id);
      if (existingTab) {
        return prev.map((t) => ({ ...t, isActive: t.id === file.id }));
      }
      return [
        ...prev.map((t) => ({ ...t, isActive: false })),
        {
          id: file.id,
          name: file.name,
          language: "typescript",
          content: file.content || "",
          isActive: true,
          isDirty: false,
        },
      ];
    });
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

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${settings.ollamaEndpoint}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: content,
          stream: false // Using non-streaming for simplicity
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }

      const data = await response.json();

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "No response received.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error: any) {
      console.error("Local Ollama Error:", error);
      const aiResponseError: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `**Connection Error**: Failed to reach your local Ollama instance at \`${settings.ollamaEndpoint}\`.\n\nMake sure Ollama is running, and you've set \`OLLAMA_ORIGINS="*"\` to allow browser access.\n\nDetails: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponseError]);
    } finally {
      setIsLoading(false);
    }
  }, [settings.ollamaEndpoint, selectedModel]);

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
  const findAndUpdateFile = (
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
  };

  const findParentAndAdd = (
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
  };

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

      // Need to find parent to assign correct parent ID for backend. For now default to root if at top
      // As a simplification, we pass "root". A robust approach searches the tree for item's parent id.
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

  const handleDialogConfirm = useCallback(
    async (value: string) => {
      const { mode, item, parentId } = dialogState;
      if (!activeProjectId) return;

      try {
        switch (mode) {
          case "new-file": {
            const newFile = await createFile(activeProjectId, value, "file", parentId || "root");
            const newFileItem: FileItem = {
              id: newFile.id,
              name: newFile.name,
              type: newFile.type,
              content: newFile.content || "",
            };
            setFiles((prev) => findParentAndAdd(prev, parentId || "root", newFileItem));
            handleFileSelect(newFileItem);
            break;
          }

          case "new-folder": {
            const newFolder = await createFile(activeProjectId, value, "folder", parentId || "root");
            const newFolderItem: FileItem = {
              id: newFolder.id,
              name: newFolder.name,
              type: newFolder.type,
              children: [],
            };
            setFiles((prev) => findParentAndAdd(prev, parentId || "root", newFolderItem));
            break;
          }

          case "rename": {
            if (item) {
              const updated = await updateFile(item.id, { name: value });
              setFiles((prev) =>
                findAndUpdateFile(prev, item.id, (f) => ({ ...f, name: updated.name }))
              );
              setTabs((prev) =>
                prev.map((t) => (t.id === item.id ? { ...t, name: updated.name } : t))
              );
            }
            break;
          }

          case "delete": {
            if (item) {
              await deleteFile(item.id);
              setFiles((prev) => findAndUpdateFile(prev, item.id, () => null));
              // Close tab if it's open
              setTabs((prev) => prev.filter((t) => t.id !== item.id));
              if (activeFileId === item.id) {
                setActiveFileId(null);
              }
            }
            break;
          }
        }
      } catch (error) {
        console.error("Failed to execute file operation on backend:", error);
      }
    },
    [dialogState, activeFileId, activeProjectId, handleFileSelect]
  );
  // --- IDE Command Listeners ---
  useIdeCommandListener("view.explorer", () => setSidebarCollapsed((prev) => !prev));
  useIdeCommandListener("view.terminal", () => setTerminalVisible((prev) => !prev));
  useIdeCommandListener("terminal.newTerminal", () => setTerminalVisible(true));
  useIdeCommandListener("file.newFile", () => handleNewFile("root"));
  useIdeCommandListener("file.newTextFile", () => handleNewFile("root"));
  useIdeCommandListener("file.openFolder", async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const localFiles = await openLocalDirectory();
        if (localFiles) {
          setFiles(localFiles);
          setActiveProjectId(null); // Clear active project since we're local now
          setTabs([]); // Clear open tabs for safety
          setActiveFileId(null);
        }
      } else {
        throw new Error("API not supported natively");
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        fallbackFileInputRef.current?.click();
      }
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
  useIdeCommandListener("file.preferences", () => setIsSettingsOpen(true));
  useIdeCommandListener("view.wordWrap", () => updateSettings({ wordWrap: !settings.wordWrap }));
  useIdeCommandListener("file.closeEditor", () => {
    if (activeFileId) handleTabClose(activeFileId);
  });
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
          />
          <Editor
            tabs={tabs}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
          />
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onActionClick={handleActionClick}
            isLoading={isLoading}
          />
        </div>
        <TerminalPanel
          isVisible={terminalVisible}
          onClose={() => setTerminalVisible(false)}
          height={terminalHeight}
          onHeightChange={setTerminalHeight}
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
