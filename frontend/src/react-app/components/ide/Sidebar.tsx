import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  Plus,
  GitBranch,
  Settings,
  Puzzle,
  Bug,
  Search,
  Sparkles,
} from "lucide-react";
import { FileItem, SidebarTab } from "@/react-app/types/ide";
import { cn } from "@/react-app/lib/utils";
import { getTranslation } from "@/react-app/lib/i18n";
import { Button } from "@/react-app/components/ui/button";
import FileContextMenu from "./FileContextMenu";
import { useSettings } from "@/react-app/contexts/SettingsContext";
import SourceControlView from "./sidebar/SourceControlView";
import DebugView from "./sidebar/DebugView";
import SearchView from "./sidebar/SearchView";
import { getFileIconUrl, getFolderIconUrl } from "@/react-app/lib/fileIcons";
import { useIdeCommand } from "@/react-app/contexts/IdeCommandContext";

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

// File icons handle centrally using full map

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
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm text-ide-text-secondary rounded-md transition-colors duration-200",
              "hover:bg-ide-hover/80 hover:text-ide-text-primary",
              "focus:outline-none"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            )}
            <img
              src={getFolderIconUrl(item.name, isExpanded)}
              alt={item.name}
              className="w-4 h-4 shrink-0"
            />
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
                Folder truncated...
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
          "w-full flex items-center gap-2 px-2 py-1.5 text-sm transition-all duration-200 border-l-[3px] rounded-r-md",
          "focus:outline-none",
          isActive
            ? "bg-ide-active/50 text-ide-text-primary border-ide-accent shadow-[inset_0_0_0_1px_hsl(var(--ide-border))]"
            : "text-ide-text-secondary border-transparent hover:bg-ide-hover/80 hover:text-ide-text-primary"
        )}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
      >
        <img src={getFileIconUrl(item.name)} alt={item.name} className="w-4 h-4 shrink-0" />
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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

  const { settings, setIsSettingsOpen, setSettingsTab } = useSettings();
  const { dispatchCommand } = useIdeCommand();
  const t = (key: string) => getTranslation(settings.language, key);

  const activityBarItems = [
    { id: "explorer" as SidebarTab, icon: <Folder className="w-5 h-5" />, label: "sidebar.explorer" },
    { id: "search" as SidebarTab, icon: <Search className="w-5 h-5" />, label: "sidebar.search" },
    { id: "git" as SidebarTab, icon: <GitBranch className="w-5 h-5" />, label: "sidebar.scm" },
    { id: "debug" as SidebarTab, icon: <Bug className="w-5 h-5" />, label: "sidebar.debug" },
    { id: "extensions" as SidebarTab, icon: <Puzzle className="w-5 h-5" />, label: "sidebar.extensions" },
    { id: "ai" as SidebarTab, icon: <Sparkles className="w-5 h-5" />, label: "sidebar.ai" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "search":
        return <SearchView rootPath={rootPath} onFileSelect={onFileSelect} />;
      case "git":
        return <SourceControlView rootPath={rootPath} />;
      case "debug":
        return <DebugView rootPath={rootPath} />;
      case "ai":
        return (
          <div className="flex flex-col h-full min-h-0">
            <div className="h-10 px-4 flex items-center border-b border-ide-border/80 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ide-text-secondary select-none">
                {t("sidebar.ai")}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 via-ide-panel to-ide-sidebar p-4 shadow-[0_0_40px_-12px_hsl(258_90%_50%/0.45)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-300" />
                  </div>
                  <span className="text-xs font-semibold text-ide-text-primary tracking-tight">AI Assistant</span>
                </div>
                <p className="text-[11px] text-ide-text-secondary leading-relaxed mb-4">
                  Inline completions, chat, and apply-to-file actions. Open the panel to work with your codebase.
                </p>
                <Button
                  type="button"
                  onClick={() => dispatchCommand("view.toggleAiChat")}
                  className="w-full h-9 text-xs font-medium rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30 border border-white/10 transition-all duration-200"
                >
                  Open AI chat
                </Button>
              </div>
              <p className="text-[10px] text-ide-text-secondary/80 leading-relaxed">
                Tip: select code and use <span className="text-ide-text-primary font-medium">Explain / Refactor</span> from the floating menu.
              </p>
            </div>
          </div>
        );
      case "explorer":
      default:
        return (
          <>
            {/* Header */}
            <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border/50">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ide-text-secondary select-none">
                {t("sidebar.explorer")}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNewFile("root")}
                  className="w-6 h-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-white/5 transition-colors"
                  title={t("menu.file.newFile")}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
              {files.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-ide-text-secondary italic">{t("sidebar.noFolderOpened")}</p>
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
    <div className="flex h-full shrink-0 border-r border-ide-border relative overflow-hidden bg-ide-bg">
      {/* Activity Bar */}
      {settings.layoutActivityBarVisible && (
        <aside className="w-12 ide-activity-bar flex flex-col items-center py-3 gap-1 shrink-0 z-20 relative">
          {/* Subtle branding text */}
          <div className="absolute top-4 w-full flex justify-center opacity-30 select-none pointer-events-none mb-4 -rotate-90 origin-center whitespace-nowrap text-[10px] text-white">
          </div>
          <div className="h-4"></div> {/* spacer for branding */}
          {activityBarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "extensions") {
                  setSettingsTab("extensions");
                  setIsSettingsOpen(true);
                  return;
                }
                if (item.id === "ai") {
                  dispatchCommand("view.toggleAiChat");
                  if (activeTab === "ai" && !isCollapsed) {
                    onToggleCollapse();
                  } else {
                    onTabChange("ai");
                    if (isCollapsed) onToggleCollapse();
                  }
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
                "p-2.5 transition-all duration-200 relative group rounded-lg",
                activeTab === item.id && !isCollapsed
                  ? "text-ide-text-primary bg-ide-active/60 shadow-[0_0_20px_-8px_hsl(var(--ide-accent-blue))]"
                  : "text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover/90"
              )}
              title={getTranslation(settings.language, item.label)}
            >
              <div className={cn(
                "transition-transform duration-200 group-hover:scale-105"
              )}>
                {item.icon}
              </div>
              {activeTab === item.id && !isCollapsed && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-gradient-to-b from-ide-accent-blue to-violet-500 rounded-r-md shadow-[0_0_12px_hsl(var(--ide-accent-blue))] transition-all duration-300" />
              )}
              <div className="absolute left-14 px-2.5 py-1.5 bg-ide-bg border border-ide-border text-[10px] font-bold uppercase tracking-wider rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-[-5px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl">
                {t(item.label)}
              </div>
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-white/5 transition-all duration-200 mb-2 rounded-md group"
            title={t("settings.title")}
          >
            <Settings className="w-5 h-5 text-ide-text-secondary transition-colors duration-200" />
          </button>
          

        </aside>
      )}

      {/* Main Container for Explorer/Search Pane */}
      {!isCollapsed && (
        <aside
          style={{ width: settings.layoutActivityBarVisible ? width - 48 : width }}
          className={cn(
            "bg-ide-sidebar flex flex-col grow select-none border-r border-ide-border/80 shadow-[inset_1px_0_0_hsl(var(--ide-border))]",
            !isResizing && "panel-transition"
          )}
        >
          {renderContent()}
        </aside>
      )}
    </div>
  );
}
