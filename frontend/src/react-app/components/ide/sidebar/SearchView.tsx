import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, FileCode, ChevronDown, ChevronRight, X } from "lucide-react";
import { fsService } from "@/services/fsService";
import { FileItem } from "@/react-app/types/ide";

interface SearchViewProps {
    rootPath?: string;
    onFileSelect: (file: FileItem) => void;
}

interface SearchResult {
    path: string;
    line: number;
    content: string;
}

interface GroupedResult {
    fileName: string;
    path: string;
    matches: SearchResult[];
    isExpanded: boolean;
}

export default function SearchView({ rootPath, onFileSelect }: SearchViewProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<GroupedResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const performSearch = useCallback(async (q: string) => {
        if (!rootPath || !q || q.length < 2) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const rawResults = await fsService.search(q, rootPath);
            // Group by path
            const groupedMap = new Map<string, GroupedResult>();
            rawResults.forEach(res => {
                if (!groupedMap.has(res.path)) {
                    groupedMap.set(res.path, {
                        fileName: res.path.split(/[/\\]/).pop() || "",
                        path: res.path,
                        matches: [],
                        isExpanded: true
                    });
                }
                groupedMap.get(res.path)!.matches.push(res);
            });
            setResults(Array.from(groupedMap.values()));
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    }, [rootPath]);

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, performSearch]);

    const toggleGroup = (path: string) => {
        setResults(prev => prev.map(g => g.path === path ? { ...g, isExpanded: !g.isExpanded } : g));
    };

    const handleResultClick = (res: SearchResult) => {
        onFileSelect({
            id: res.path, // Use path as ID for search results to ensure uniqueness
            name: res.path.split(/[/\\]/).pop() || "",
            type: "file",
            path: res.path
        });
    };

    return (
        <div className="flex flex-col h-full bg-ide-sidebar">
            {/* Header */}
            <div className="h-10 px-4 flex items-center border-b border-ide-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ide-text-secondary select-none">
                    Search
                </span>
            </div>

            <div className="p-4 border-b border-ide-border bg-ide-sidebar/50">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-text-secondary" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full bg-ide-input border border-ide-border rounded px-8 py-1.5 text-xs text-ide-text-primary focus:outline-none focus:border-indigo-500 transition-colors"
                        autoFocus
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ide-text-secondary hover:text-ide-text-primary"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <div className="mt-2 text-[10px] text-ide-text-secondary flex justify-between items-center px-1">
                    <span>
                        {isSearching ? (
                            <span className="flex items-center gap-1.5">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                Searching...
                            </span>
                        ) : (
                            query.length >= 2 ? `${results.length} files found` : "Enter at least 2 chars"
                        )}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {query.length >= 2 && results.length === 0 && !isSearching ? (
                    <div className="px-4 py-8 text-center">
                        <p className="text-xs text-ide-text-secondary italic">No results found for "{query}"</p>
                    </div>
                ) : !query || query.length < 2 ? (
                    <div className="px-4 py-8 text-center">
                        <p className="text-xs text-ide-text-secondary italic">Enter search query to find in project</p>
                    </div>
                ) : (
                    results.map(group => (
                        <div key={group.path} className="mb-1">
                            <button
                                onClick={() => toggleGroup(group.path)}
                                className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover transition-colors group"
                            >
                                {group.isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-ide-text-secondary" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-ide-text-secondary" />
                                )}
                                <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                                <span className="text-xs text-ide-text-primary truncate font-medium">{group.fileName}</span>
                                <span className="text-[10px] text-ide-text-secondary ml-auto bg-ide-border/50 px-1.5 py-0.5 rounded-full">
                                    {group.matches.length}
                                </span>
                            </button>

                            {group.isExpanded && (
                                <div className="mt-0.5 space-y-px">
                                    {group.matches.map((match, idx) => (
                                        <button
                                            key={`${group.path}-${idx}`}
                                            onClick={() => handleResultClick(match)}
                                            className="w-full pl-9 pr-3 py-1.5 text-xs text-ide-text-secondary hover:bg-ide-hover hover:text-ide-text-primary text-left flex flex-col transition-colors border-l-2 border-transparent hover:border-indigo-500/50 group/item"
                                        >
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-[9px] text-indigo-400/80 font-mono font-bold tracking-tight uppercase">Line {match.line}</span>
                                            </div>
                                            <div className="truncate font-mono text-[11px] opacity-90 leading-relaxed">
                                                {match.content.split(new RegExp(`(${query})`, 'gi')).map((part, i) =>
                                                    part.toLowerCase() === query.toLowerCase()
                                                        ? <span key={i} className="bg-indigo-500/40 text-indigo-100 rounded-sm px-0.5 font-bold shadow-[0_0_5px_rgba(99,102,241,0.3)]">{part}</span>
                                                        : part
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
