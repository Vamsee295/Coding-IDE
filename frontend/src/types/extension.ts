export interface Extension {
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    enabled: boolean;
    publisher?: string;
    icon?: string | null;
    source?: 'builtin' | 'vscode-import';
}

export interface VSCodeExtension {
    id: string;
    name: string;
    publisher: string;
    version: string;
    description: string;
    categories: string[];
    icon: string | null;
    folderName: string;
    imported: boolean;
}
