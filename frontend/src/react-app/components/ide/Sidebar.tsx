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
} from "lucide-react";
import { FileItem } from "@/react-app/types/ide";
import { cn } from "@/react-app/lib/utils";
import { Button } from "@/react-app/components/ui/button";
import FileContextMenu from "./FileContextMenu";
import { useSettings } from "@/react-app/contexts/SettingsContext";

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

  const { setSettingsTab, setIsSettingsOpen } = useSettings();

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-ide-sidebar border-r border-ide-border flex flex-col items-center py-3 gap-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="w-8 h-8 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          title="Explorer"
        >
          <Folder className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          title="Source Control"
        >
          <GitBranch className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSettingsTab("extensions");
            setIsSettingsOpen(true);
          }}
          className="w-8 h-8 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          title="Extensions"
        >
          <Puzzle className="w-5 h-5" />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSettingsOpen(true)}
          className="w-8 h-8 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-ide-sidebar border-r border-ide-border flex flex-col shrink-0">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-ide-border">
        <span className="text-xs font-medium uppercase tracking-wider text-ide-text-secondary">
          Explorer
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNewFile("root")}
          className="w-6 h-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Project Name */}
      <div className="px-3 py-2 border-b border-ide-border">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 text-sm font-medium text-ide-text-primary hover:text-indigo-400 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          <span>my-project</span>
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((file) => (
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
        ))}
      </div>
    </aside>
  );
}
