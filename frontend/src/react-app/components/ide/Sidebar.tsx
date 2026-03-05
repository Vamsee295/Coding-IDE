import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Search,
  GitBranch,
  Settings,
  Puzzle,
  FileCode,
  FileJson,
  FileText,
  Bug,
} from "lucide-react";
import { FileItem, SidebarTab } from "@/react-app/types/ide";
import { cn } from "@/react-app/lib/utils";
import { Button } from "@/react-app/components/ui/button";
import FileContextMenu from "./FileContextMenu";
import { useSettings } from "@/react-app/contexts/SettingsContext";
import SearchView from "./sidebar/SearchView";
import SourceControlView from "./sidebar/SourceControlView";
import DebugView from "./sidebar/DebugView";

interface SidebarProps {
  files: FileItem[];
  activeFileId: string | null;
  onFileSelect: (file: FileItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewFile: (parentId: string) => void;
  onNewFolder: (parentId: string) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onDuplicate: (item: FileItem) => void;
  onFolderExpand?: (item: FileItem) => void;
  width: number;
  isResizing: boolean;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  rootPath?: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case "js":
    case "jsx":
      return <FileCode className="w-4 h-4 text-yellow-400" />;
    case "json":
      return <FileJson className="w-4 h-4 text-yellow-300" />;
    case "html":
      return <FileCode className="w-4 h-4 text-orange-400" />;
    case "css":
      return <FileCode className="w-4 h-4 text-blue-300" />;
    case "md":
      return <FileText className="w-4 h-4 text-gray-400" />;
    default:
      return <File className="w-4 h-4 text-ide-text-secondary" />;
  }
};

interface FileTreeItemProps {
  item: FileItem;
  depth: number;
  activeFileId: string | null;
  onFileSelect: (file: FileItem) => void;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  onNewFile: (parentId: string) => void;
  onNewFolder: (parentId: string) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onDuplicate: (item: FileItem) => void;
  onFolderExpand?: (item: FileItem) => void;
}

function FileTreeItem({
  item,
  depth,
  activeFileId,
  onFileSelect,
  expandedFolders,
  toggleFolder,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onDuplicate,
  onFolderExpand,
}: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(item.id);
  const isActive = item.id === activeFileId;

  if (item.type === "folder") {
    return (
      <div>
        <FileContextMenu
          item={item}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          onRename={onRename}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        >
          <button
            onClick={() => {
              toggleFolder(item.id);
              if (!isExpanded && onFolderExpand) {
                onFolderExpand(item);
              }
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm text-ide-text-secondary hover:bg-ide-hover transition-colors",
              "focus:outline-none focus:bg-ide-hover"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span className="truncate">{item.name}</span>
          </button>
        </FileContextMenu>
        {isExpanded && item.children && (
          <div>
            {item.children.map((child) => (
              <FileTreeItem
                key={child.id}
                item={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                onNewFile={onNewFile}
                onNewFolder={onNewFolder}
                onRename={onRename}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onFolderExpand={onFolderExpand}
              />
            ))}
            {item.truncated && (
              <div
                className="py-1 px-2 text-[10px] text-yellow-500/70 italic border-l border-ide-border ml-2"
                style={{ marginLeft: `${(depth + 1) * 12 + 8}px` }}
              >
                Folder truncated... (Limit: 500)
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <FileContextMenu
      item={item}
      onNewFile={onNewFile}
      onNewFolder={onNewFolder}
      onRename={onRename}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    >
      <button
        onClick={() => onFileSelect(item)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 text-sm transition-colors",
          "focus:outline-none",
          isActive
            ? "bg-ide-active text-ide-text-primary"
            : "text-ide-text-secondary hover:bg-ide-hover hover:text-ide-text-primary"
        )}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
      >
        {getFileIcon(item.name)}
        <span className="truncate">{item.name}</span>
      </button>
    </FileContextMenu>
  );
}

export default function Sidebar({
  files,
  activeFileId,
  onFileSelect,
  isCollapsed,
  onToggleCollapse,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onDuplicate,
  onFolderExpand,
  width,
  isResizing,
  activeTab,
  onTabChange,
  rootPath,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src", "components"]));

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const { setIsSettingsOpen, setSettingsTab } = useSettings();

  const activityBarItems = [
    { id: "explorer" as SidebarTab, icon: <Folder className="w-5 h-5" />, label: "Explorer" },
    { id: "search" as SidebarTab, icon: <Search className="w-5 h-5" />, label: "Search" },
    { id: "git" as SidebarTab, icon: <GitBranch className="w-5 h-5" />, label: "Source Control" },
    { id: "debug" as SidebarTab, icon: <Bug className="w-5 h-5" />, label: "Run & Debug" },
    { id: "extensions" as SidebarTab, icon: <Puzzle className="w-5 h-5" />, label: "Extensions" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "search":
        return <SearchView rootPath={rootPath} onFileSelect={onFileSelect} />;
      case "git":
        return <SourceControlView rootPath={rootPath} />;
      case "debug":
        return <DebugView rootPath={rootPath} />;
      case "explorer":
      default:
        return (
          <>
            {/* Header */}
            <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ide-text-secondary select-none">
                Explorer
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNewFile("root")}
                  className="w-6 h-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
                  title="New File"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
              {files.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-ide-text-secondary italic">No folder opened</p>
                </div>
              ) : (
                files.map((file) => (
                  <FileTreeItem
                    key={file.id}
                    item={file}
                    depth={0}
                    activeFileId={activeFileId}
                    onFileSelect={onFileSelect}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    onNewFile={onNewFile}
                    onNewFolder={onNewFolder}
                    onRename={onRename}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onFolderExpand={onFolderExpand}
                  />
                ))
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex h-full shrink-0 border-r border-ide-border relative overflow-hidden">
      {/* Activity Bar */}
      <aside className="w-12 bg-[#0d0f17] border-r border-ide-border flex flex-col items-center py-4 gap-4 shrink-0 z-20">
        {activityBarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "extensions") {
                setSettingsTab("extensions");
                setIsSettingsOpen(true);
                return;
              }
              if (activeTab === item.id && !isCollapsed) {
                onToggleCollapse();
              } else {
                onTabChange(item.id);
                if (isCollapsed) onToggleCollapse();
              }
            }}
            className={cn(
              "p-2.5 transition-all relative group",
              activeTab === item.id && !isCollapsed
                ? "text-indigo-400"
                : "text-ide-text-secondary hover:text-ide-text-primary"
            )}
            title={item.label}
          >
            {item.icon}
            {activeTab === item.id && !isCollapsed && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-indigo-500 rounded-r shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            )}
            <div className="absolute left-14 px-2 py-1 bg-ide-sidebar border border-ide-border text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {item.label}
            </div>
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 text-ide-text-secondary hover:text-ide-text-primary transition-all mb-2"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Container for Explorer/Search Pane */}
      {!isCollapsed && (
        <aside
          style={{ width: width - 48 }}
          className={cn(
            "bg-ide-sidebar flex flex-col grow select-none",
            !isResizing && "transition-all duration-300"
          )}
        >
          {renderContent()}
        </aside>
      )}
    </div>
  );
}
