import { useState, useEffect, useRef } from "react";
import { File, Folder, Search } from "lucide-react";
import { FileItem } from "@/react-app/types/ide";
import { cn } from "@/react-app/lib/utils";

interface FileMentionsProps {
    files: FileItem[];
    filter: string;
    onSelect: (item: FileItem) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

export default function FileMentions({ files, filter, onSelect, onClose, position }: FileMentionsProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Flatten the file tree for linear navigation
    const flattenFiles = (items: FileItem[]): FileItem[] => {
        let result: FileItem[] = [];
        items.forEach(item => {
            result.push(item);
            if (item.children) {
                result = [...result, ...flattenFiles(item.children)];
            }
        });
        return result;
    };

    const allFiles = flattenFiles(files);
    const filteredFiles = allFiles.filter(f =>
        f.name.toLowerCase().includes(filter.toLowerCase())
    ).slice(0, 10); // Limit to top 10 results

    useEffect(() => {
        setSelectedIndex(0);
    }, [filter]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredFiles.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (filteredFiles[selectedIndex]) {
                    onSelect(filteredFiles[selectedIndex]);
                }
            } else if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [filteredFiles, selectedIndex, onSelect, onClose]);

    if (filteredFiles.length === 0) return null;

    return (
        <div
            className="fixed z-[100] w-64 bg-ide-sidebar border border-ide-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: position.top - (filteredFiles.length * 32) - 10, // Show above cursor
                left: position.left
            }}
        >
            <div className="px-3 py-1.5 border-b border-ide-border bg-ide-bg/50 flex items-center gap-2">
                <Search className="w-3 h-3 text-ide-text-secondary" />
                <span className="text-[10px] font-semibold text-ide-text-secondary uppercase tracking-wider">Mention File</span>
            </div>
            <div ref={scrollRef} className="max-h-64 overflow-y-auto py-1 text-sm">
                {filteredFiles.map((file, index) => (
                    <button
                        key={file.id}
                        onClick={() => onSelect(file)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors",
                            index === selectedIndex ? "bg-indigo-600 text-white" : "text-ide-text-primary hover:bg-ide-hover"
                        )}
                    >
                        {file.type === "folder" ? (
                            <Folder className={cn("w-3.5 h-3.5", index === selectedIndex ? "text-white" : "text-indigo-400")} />
                        ) : (
                            <File className={cn("w-3.5 h-3.5", index === selectedIndex ? "text-white" : "text-indigo-300")} />
                        )}
                        <span className="truncate">{file.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
