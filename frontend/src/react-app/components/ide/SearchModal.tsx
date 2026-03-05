import { useState, useEffect } from 'react';
import { Search, X, Loader2, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { fsService } from '@/services/fsService';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    rootPath: string;
    onOpenFile: (path: string, line?: number) => void;
}

export default function SearchModal({ isOpen, onClose, rootPath, onOpenFile }: SearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Array<{ path: string, line: number, content: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSearched(false);
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (!query.trim() || !rootPath) return;
        setLoading(true);
        setSearched(true);
        try {
            const res = await fsService.search(query, rootPath);
            setResults(res || []);
        } catch (e) {
            console.error("Search failed:", e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-ide-sidebar border border-ide-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-ide-border flex items-center gap-3">
                    <Search className="w-5 h-5 text-indigo-400" />
                    <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search workspace..."
                        className="flex-1 bg-ide-bg border-ide-border/50 h-10 text-ide-text-primary"
                        autoFocus
                    />
                    <Button onClick={handleSearch} disabled={loading || !query.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-ide-text-secondary hover:text-white">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 max-h-[60vh] overflow-y-auto">
                    {!loading && !searched && (
                        <div className="flex flex-col items-center justify-center p-12 text-ide-text-secondary opacity-60">
                            <Search className="w-12 h-12 mb-4 opacity-50" />
                            <p>Type to search across {rootPath}</p>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center p-12 gap-3 text-ide-text-secondary">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            <p>Searching workspace...</p>
                        </div>
                    )}

                    {!loading && searched && results.length === 0 && (
                        <div className="p-12 text-center text-ide-text-secondary">
                            No results found for "{query}"
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="p-2 space-y-1">
                            <div className="px-3 py-2 text-xs font-semibold text-ide-text-secondary uppercase tracking-wider sticky top-0 bg-ide-sidebar z-10 border-b border-ide-border/50">
                                {results.length} results found
                            </div>
                            {results.map((res, i) => {
                                const relPath = res.path.replace(rootPath, '').replace(/^[\\/]/, '');
                                return (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            onOpenFile(res.path, res.line);
                                            onClose();
                                        }}
                                        className="flex flex-col px-3 py-2.5 rounded-lg hover:bg-ide-hover cursor-pointer group transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                <span className="text-xs font-medium text-ide-text-primary truncate">{relPath}</span>
                                            </div>
                                            <span className="text-[10px] text-ide-text-secondary/50 font-mono bg-ide-bg px-1.5 py-0.5 rounded border border-ide-border/50">Line {res.line}</span>
                                        </div>
                                        <div className="flex items-start gap-2 pl-5">
                                            <ChevronRight className="w-3 h-3 text-ide-text-secondary/50 shrink-0 mt-0.5" />
                                            <p className="text-xs text-ide-text-secondary font-mono truncate opacity-80 group-hover:text-ide-text-primary group-hover:opacity-100 transition-colors">
                                                {res.content.trim()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
