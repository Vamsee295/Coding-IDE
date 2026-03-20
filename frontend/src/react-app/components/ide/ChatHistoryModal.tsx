import { useState } from 'react';
import { Clock, X, MessageSquare, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { ChatSession } from '@/react-app/types/ide';

interface ChatHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: ChatSession[];
    onSelectSession: (sessionId: string) => void;
    onDeleteSession?: (sessionId: string) => void;
}

export default function ChatHistoryModal({
    isOpen,
    onClose,
    sessions,
    onSelectSession,
    onDeleteSession
}: ChatHistoryModalProps) {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredSessions = sessions.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (session.messages[0]?.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatRelativeTime = (date: Date | string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        if (diffDays === 1) return 'Yesterday';
        return d.toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-xl bg-ide-sidebar border border-ide-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-ide-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-medium text-ide-text-primary">Chat History</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-ide-text-secondary hover:text-white">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-3 border-b border-ide-border/50">
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-ide-bg border border-ide-border/50 rounded-md p-2 text-xs text-ide-text-primary focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex-1 max-h-[50vh] overflow-y-auto p-2 space-y-1">
                    {filteredSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-ide-text-secondary opacity-60">
                            <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                            <p className="text-xs">No saved conversations</p>
                        </div>
                    ) : (
                        filteredSessions.map((session) => (
                            <div
                                key={session.id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-ide-hover cursor-pointer group transition-colors"
                                onClick={() => {
                                    onSelectSession(session.id);
                                    onClose();
                                }}
                            >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-xs font-medium text-ide-text-primary truncate">
                                            {session.title || "New Conversation"}
                                        </span>
                                        <span className="text-[10px] text-ide-text-secondary mt-1 flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-ide-text-secondary/50" />
                                            {formatRelativeTime(session.timestamp)}
                                        </span>
                                    </div>
                                </div>
                                {onDeleteSession && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteSession(session.id);
                                        }}
                                        className="text-ide-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
