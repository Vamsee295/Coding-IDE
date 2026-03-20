export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  language?: string;
  content?: string;
  children?: FileItem[];
  isOpen?: boolean;
  path?: string;
  truncated?: boolean;
}

export interface AIAction {
  type: "write_file" | "create_file" | "run_command" | "delete_file" | "rename_file" | "insert_at_line" | "replace_range" | "read_file";
  path?: string;
  content?: string;
  command?: string;
  newPath?: string;      // for rename_file
  line?: number;         // for insert_at_line
  fromLine?: number;     // for replace_range
  toLine?: number;       // for replace_range
  isRevert?: boolean;    // for revert flow
}


export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  attachedImages?: string[];
  applied?: boolean; // Track if actions were applied
}

export interface Snapshot {
  id: string;
  timestamp: Date;
  messageId: string;
  files: {
    path: string;
    originalContent: string;
    modifiedContent: string;
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: Date;
}

export interface EditorTab {
  id: string;
  name: string;
  language: string;
  content: string;
  isActive: boolean;
  isDirty: boolean;
  path?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export type SidebarTab = "explorer" | "search" | "git" | "debug" | "extensions";
