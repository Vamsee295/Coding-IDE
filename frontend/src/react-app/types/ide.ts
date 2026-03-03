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
  type: "write_file" | "create_file" | "run_command";
  path?: string;
  content?: string;
  command?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  attachedImages?: string[];
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
