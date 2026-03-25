import React, { useEffect, useState } from 'react';
import { useChatStore } from '@/react-app/store/useChatStore';
import { useIdeStore } from '@/react-app/store/useIdeStore';
import { MessageSquare, Clock, Search, X, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { CONFIG } from '@/react-app/lib/config';

interface ChatHistoryItem {
    id: string;
    title: string;
    timestamp: string;
}

interface GroupedHistory {
    id: string;
    label: string;
    items: ChatHistoryItem[];
}

export default function ChatHistorySidebar({ onClose, width }: { onClose: () => void, width?: number }) {
    const { activeProjectPath } = useIdeStore();
    const { currentSessionId, newChat, loadChat, deleteChat, renameChat } = useChatStore();
    
    const [groupedHistory, setGroupedHistory] = useState<GroupedHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        if (activeProjectPath) {
            loadHistory();
        }
    }, [activeProjectPath]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const datesRes = await fetch(`${CONFIG.TERMINAL_SERVER_URL}/api/chat/history/dates?projectPath=${encodeURIComponent(activeProjectPath!)}`);
            if (!datesRes.ok) throw new Error("Failed to fetch dates");
            const dates: string[] = await datesRes.json();

            const historyItems: ChatHistoryItem[] = [];

            for (const date of dates) {
                const chatsRes = await fetch(`${CONFIG.TERMINAL_SERVER_URL}/api/chat/history/chats?projectPath=${encodeURIComponent(activeProjectPath!)}&date=${date}`);
                if (chatsRes.ok) {
                    const chatIds: string[] = await chatsRes.json();
                    const chatPromises = chatIds.map(async (id) => {
                        const res = await fetch(`${CONFIG.TERMINAL_SERVER_URL}/api/chat/history/chat?projectPath=${encodeURIComponent(activeProjectPath!)}&date=${date}&id=${id}`);
                        if (res.ok) {
                            const data = await res.json();
                            return {
                                id: id,
                                title: data.title || "New Chat",
                                timestamp: data.updatedAt || data.timestamp || date
                            };
                        }
                        return null;
                    });

                    const loadedChats = await Promise.all(chatPromises);
                    loadedChats.forEach(c => { if (c) historyItems.push(c); });
                }
            }
            groupAndSetHistory(historyItems);
        } catch (error) {
            console.error("Error loading chat history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const groupAndSetHistory = (items: ChatHistoryItem[]) => {
        const today: ChatHistoryItem[] = [];
        const yesterday: ChatHistoryItem[] = [];
        const thisWeek: ChatHistoryItem[] = [];
        const older: ChatHistoryItem[] = [];

        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        items.forEach(item => {
            const date = new Date(item.timestamp);
            if (isToday(date)) today.push(item);
            else if (isYesterday(date)) yesterday.push(item);
            else if (isThisWeek(date)) thisWeek.push(item);
            else older.push(item);
        });

        const groups: GroupedHistory[] = [];
        if (today.length) groups.push({ id: 'today', label: 'Today', items: today });
        if (yesterday.length) groups.push({ id: 'yesterday', label: 'Yesterday', items: yesterday });
        if (thisWeek.length) groups.push({ id: 'this-week', label: 'Previous 7 Days', items: thisWeek });
        if (older.length) groups.push({ id: 'older', label: 'Older', items: older });

        setGroupedHistory(groups);
    };

    const handleSelectChat = (id: string, timestamp: string) => {
        if (editingId) return;
        const dateStr = new Date(timestamp).toISOString().split('T')[0];
        loadChat(activeProjectPath!, dateStr, id);
    };

    const handleDelete = async (e: React.MouseEvent, id: string, timestamp: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this chat?")) return;
        const dateStr = new Date(timestamp).toISOString().split('T')[0];
        await deleteChat(activeProjectPath!, dateStr, id);
        loadHistory();
    };

    const startRename = (e: React.MouseEvent, item: ChatHistoryItem) => {
        e.stopPropagation();
        setEditingId(item.id);
        setEditValue(item.title);
    };

    const confirmRename = async (e: React.MouseEvent | React.KeyboardEvent, item: ChatHistoryItem) => {
        e.stopPropagation();
        if (!editValue.trim() || editValue === item.title) {
            setEditingId(null);
            return;
        }
        const dateStr = new Date(item.timestamp).toISOString().split('T')[0];
        await renameChat(activeProjectPath!, dateStr, item.id, editValue.trim());
        setEditingId(null);
        loadHistory();
    };

    const filteredGroups = groupedHistory.map(group => ({
        ...group,
        items: group.items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(group => group.items.length > 0);

    return (
        <div 
            style={{ width: width || 256 }}
            className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333] shrink-0 text-[#cccccc]"
        >
            <div className="flex items-center justify-between p-3 border-b border-[#333]">
                <span className="font-semibold text-sm">Chat History</span>
                <div className="flex gap-1">
                    <button onClick={newChat} className="p-1 hover:bg-[#333] rounded transition-colors" title="New Chat">
                        <Plus size={16} />
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-[#333] rounded transition-colors" title="Close">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="p-3">
                <div className="relative">
                    <Search className="absolute left-2 text-[#666] top-1/2 -translate-y-1/2" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search chats..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#2a2a2a] border border-[#333] rounded px-7 py-1.5 text-xs focus:outline-none focus:border-[#007acc] transition-colors"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full pb-4">
                {isLoading ? (
                    <div className="flex items-center justify-center p-6 text-xs text-[#666]">Loading history...</div>
                ) : filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-xs text-[#666]">
                        <MessageSquare size={24} className="mb-2 opacity-50" />
                        No chats found
                    </div>
                ) : (
                    <div className="px-2 space-y-4">
                        {filteredGroups.map(group => (
                            <div key={group.id}>
                                <div className="text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1 px-2">
                                    {group.label}
                                </div>
                                <div className="space-y-0.5">
                                    {group.items.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleSelectChat(item.id, item.timestamp)}
                                            className={`group relative w-full text-left px-2 py-1.5 flex flex-col rounded cursor-pointer ${currentSessionId === item.id ? 'bg-[#004a77] text-white' : 'hover:bg-[#2a2a2a]'}`}
                                        >
                                            {editingId === item.id ? (
                                                <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                                                    <input 
                                                        autoFocus
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && confirmRename(e, item)}
                                                        className="flex-1 bg-black/30 border border-[#007acc] rounded px-1 py-0.5 text-xs focus:outline-none"
                                                    />
                                                    <button onClick={e => confirmRename(e, item)} className="p-0.5 hover:text-green-400">
                                                        <Check size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-xs truncate block max-w-[85%]">{item.title}</span>
                                                    <div className="flex items-center text-[10px] opacity-60 mt-0.5">
                                                        <span>{format(new Date(item.timestamp), 'h:mm a')}</span>
                                                    </div>
                                                    
                                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={e => startRename(e, item)}
                                                            className="p-1 hover:bg-[#444] rounded text-[#888] hover:text-[#ccc]"
                                                            title="Rename"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button 
                                                            onClick={e => handleDelete(e, item.id, item.timestamp)}
                                                            className="p-1 hover:bg-[#444] rounded text-[#888] hover:text-red-400"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
