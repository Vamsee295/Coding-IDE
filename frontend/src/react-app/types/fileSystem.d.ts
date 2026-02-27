// Add typing for window.showDirectoryPicker() and related File System Access API methods

interface FileSystemHandle {
    readonly kind: "file" | "directory";
    readonly name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: "file";
    getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: "directory";
    values(): AsyncIterableIterator<FileSystemHandle>;
}

interface Window {
    showDirectoryPicker(options?: any): Promise<FileSystemDirectoryHandle>;
}

// Allow CSS module imports (e.g. xterm/css/xterm.css)
declare module "*.css" {
    const styles: Record<string, string>;
    export default styles;
}
