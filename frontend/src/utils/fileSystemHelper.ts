import { FileItem } from "@/react-app/types/ide";

const generateUniqueId = () => {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Recursively reads a FileSystemDirectoryHandle and populates the children array.
 */
const readDirectory = async (dirHandle: FileSystemDirectoryHandle, children: FileItem[]) => {
    for await (const entry of (dirHandle as any).values()) {

        // Ignore heavy local directories common in JS projects
        if (entry.name === "node_modules" || entry.name === ".git") {
            continue;
        }

        if (entry.kind === "file") {
            const fileHandle = entry as FileSystemFileHandle;
            const file = await fileHandle.getFile();

            // Read file content (ignoring binary files for the IDE text editor constraint)
            let content = "";
            try {
                content = await file.text();
            } catch (e) {
                content = "// Binary file or unreadable format";
            }

            children.push({
                id: generateUniqueId(),
                name: entry.name,
                type: "file",
                content: content
            });
        } else if (entry.kind === "directory") {
            const subDirHandle = entry as FileSystemDirectoryHandle;
            const folderItem: FileItem = {
                id: generateUniqueId(),
                name: entry.name,
                type: "folder",
                children: []
            };

            await readDirectory(subDirHandle, folderItem.children!);
            children.push(folderItem);
        }
    }

    // Sort: Folders first, then alphabetically
    children.sort((a, b) => {
        if (a.type === b.type) {
            return a.name.localeCompare(b.name);
        }
        return a.type === "folder" ? -1 : 1;
    });
};

/**
 * Prompts the user to select a directory and recursively reads its contents
 * into a structured FileItem array suitable for the IDE Sidebar.
 */
export const openLocalDirectory = async (): Promise<FileItem[] | null> => {
    try {
        if ('showDirectoryPicker' in window) {
            // Show directory picker (requires user gesture)
            const dirHandle = await window.showDirectoryPicker({
                mode: "read"
            });

            const rootItem: FileItem = {
                id: generateUniqueId(),
                name: dirHandle.name,
                type: "folder",
                children: [],
            };

            await readDirectory(dirHandle, rootItem.children!);
            return [rootItem];
        }
        throw new Error("API not supported natively");
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return null;
        }
        console.warn("Native File System API failed, fallback required in component.", error);
        throw error;
    }
};

/**
 * Converts a FileList (from an <input type="file" webkitdirectory />) into the IDE FileItem forest format.
 */
export const buildTreeFromFiles = async (files: FileList | null): Promise<FileItem[] | null> => {
    if (!files || files.length === 0) {
        return null;
    }

    const map = new Map<string, FileItem>();
    const roots: FileItem[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const webkitRelativePath = file.webkitRelativePath; // e.g. "my-project/src/index.ts"
        if (!webkitRelativePath) continue;

        const pathParts = webkitRelativePath.split('/');

        // Ignore heavy local directories common in JS projects
        if (pathParts.includes("node_modules") || pathParts.includes(".git")) {
            continue;
        }

        let parentItem: FileItem | null = null;

        for (let j = 0; j < pathParts.length; j++) {
            const part = pathParts[j];
            const isFile = j === pathParts.length - 1;
            const fullPath = pathParts.slice(0, j + 1).join('/');

            if (!map.has(fullPath)) {
                if (isFile) {
                    let content = "";
                    try {
                        content = await file.text();
                    } catch {
                        content = "// Binary file or unreadable format";
                    }
                    const newFile: FileItem = {
                        id: generateUniqueId(),
                        name: part,
                        type: "file",
                        content
                    };
                    map.set(fullPath, newFile);
                    if (parentItem && parentItem.children) {
                        parentItem.children.push(newFile);
                    } else if (!parentItem) {
                        roots.push(newFile);
                    }
                } else {
                    const newFolder: FileItem = {
                        id: generateUniqueId(),
                        name: part,
                        type: "folder",
                        children: []
                    };
                    map.set(fullPath, newFolder);
                    if (parentItem && parentItem.children) {
                        parentItem.children.push(newFolder);
                    } else if (!parentItem) {
                        roots.push(newFolder);
                    }
                }
            }
            parentItem = map.get(fullPath) || null;
        }
    }

    // Sort children functions
    const sortRecursively = (items: FileItem[]) => {
        items.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === "folder" ? -1 : 1;
        });
        items.forEach((item) => {
            if (item.children) sortRecursively(item.children);
        });
    };
    sortRecursively(roots);

    return roots;
};
