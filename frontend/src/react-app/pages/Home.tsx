import { useState, useCallback } from "react";
import Navbar from "@/react-app/components/ide/Navbar";
import Sidebar from "@/react-app/components/ide/Sidebar";
import Editor from "@/react-app/components/ide/Editor";
import ChatPanel from "@/react-app/components/ide/ChatPanel";
import TerminalPanel from "@/react-app/components/ide/TerminalPanel";
import FileOperationDialog from "@/react-app/components/ide/FileOperationDialog";
import { FileItem, ChatMessage, EditorTab } from "@/react-app/types/ide";

// Initial file structure
const initialFiles: FileItem[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          {
            id: "Button.tsx",
            name: "Button.tsx",
            type: "file",
            content: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  onClick 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors';
  
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ghost: 'bg-transparent hover:bg-gray-100'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button 
      className={\`\${baseStyles} \${variants[variant]} \${sizes[size]}\`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}`,
          },
          {
            id: "Header.tsx",
            name: "Header.tsx",
            type: "file",
            content: `import { useState } from 'react';
import { Button } from './Button';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold">Logo</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost">Sign In</Button>
            <Button variant="primary">Get Started</Button>
          </div>
        </div>
      </nav>
    </header>
  );
}`,
          },
        ],
      },
      {
        id: "App.tsx",
        name: "App.tsx",
        type: "file",
        content: `import { Header } from './components/Header';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to My App
        </h1>
        <p className="mt-4 text-gray-600">
          Start building something amazing.
        </p>
      </main>
    </div>
  );
}

export default App;`,
      },
      {
        id: "main.tsx",
        name: "main.tsx",
        type: "file",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      },
    ],
  },
  {
    id: "package.json",
    name: "package.json",
    type: "file",
    content: `{
  "name": "my-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`,
  },
  {
    id: "README.md",
    name: "README.md",
    type: "file",
    content: `# My Project

A modern React application built with TypeScript and Vite.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- ⚡️ Vite for fast development
- 🔷 TypeScript for type safety
- ⚛️ React 18 with hooks
- 🎨 Tailwind CSS for styling
`,
  },
];

export default function HomePage() {
  const [selectedModel, setSelectedModel] = useState("qwen2.5-coder:7b");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>("Button.tsx");
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: "Button.tsx",
      name: "Button.tsx",
      language: "typescript",
      content: initialFiles[0].children![0].children![0].content || "",
      isActive: true,
      isDirty: false,
    },
  ]);
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

  const handleSendMessage = useCallback((content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I understand you're asking about: "${content}"\n\nThis is a demo interface. In the full version, this would connect to your local Ollama instance at localhost:11434 and use the selected model to process your request.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  }, []);

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

  const generateUniqueId = () => {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  const handleDuplicate = useCallback((item: FileItem) => {
    if (item.type === "folder") return;

    const newItem: FileItem = {
      ...item,
      id: generateUniqueId(),
      name: item.name.replace(/(\.[^.]+)$/, " copy$1"),
    };

    setFiles((prev) => {
      // Find the parent and add the new item next to the original
      const addDuplicate = (items: FileItem[]): FileItem[] => {
        const result: FileItem[] = [];
        for (const curr of items) {
          result.push(curr);
          if (curr.id === item.id) {
            result.push(newItem);
          } else if (curr.children) {
            curr.children = addDuplicate(curr.children);
          }
        }
        return result;
      };
      return addDuplicate(prev);
    });
  }, []);

  const handleDialogConfirm = useCallback(
    (value: string) => {
      const { mode, item, parentId } = dialogState;

      switch (mode) {
        case "new-file": {
          const newFile: FileItem = {
            id: generateUniqueId(),
            name: value,
            type: "file",
            content: "",
          };
          setFiles((prev) => findParentAndAdd(prev, parentId!, newFile));
          break;
        }

        case "new-folder": {
          const newFolder: FileItem = {
            id: generateUniqueId(),
            name: value,
            type: "folder",
            children: [],
          };
          setFiles((prev) => findParentAndAdd(prev, parentId!, newFolder));
          break;
        }

        case "rename": {
          if (item) {
            setFiles((prev) =>
              findAndUpdateFile(prev, item.id, (f) => ({ ...f, name: value }))
            );
            // Update tab name if it's open
            setTabs((prev) =>
              prev.map((t) => (t.id === item.id ? { ...t, name: value } : t))
            );
          }
          break;
        }

        case "delete": {
          if (item) {
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
    },
    [dialogState, activeFileId]
  );

  return (
    <div className="h-screen flex flex-col bg-ide-bg overflow-hidden">
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
