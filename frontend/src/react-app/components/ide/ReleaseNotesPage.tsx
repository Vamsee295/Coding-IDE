import { Tag, Zap, FileText, Terminal, MessageSquare, Bug, Puzzle, GitBranch, Search } from 'lucide-react';

const RELEASES = [
    {
        version: "v1.9.0",
        date: "March 2026",
        tag: "latest",
        changes: [
            { icon: <Terminal className="w-3.5 h-3.5 text-green-400" />, title: "HELP Menu", desc: "Fully implemented all 16 Help menu commands including documentation, release notes, and developer tools." },
            { icon: <Search className="w-3.5 h-3.5 text-blue-400" />, title: "Replace in Files", desc: "Real workspace-wide Replace in Files with per-file checkbox selection and fsService integration." },
            { icon: <FileText className="w-3.5 h-3.5 text-indigo-400" />, title: "Status Bar", desc: "Added VS Code-style bottom status bar showing language, cursor position, git branch, and error counts." },
            { icon: <Terminal className="w-3.5 h-3.5 text-purple-400" />, title: "True Split Terminal", desc: "Terminal panels now render side-by-side with independent xterm.js instances." },
        ]
    },
    {
        version: "v1.8.0",
        date: "March 2026",
        tag: "stable",
        changes: [
            { icon: <Terminal className="w-3.5 h-3.5 text-green-400" />, title: "TERMINAL Menu", desc: "Implemented Kill Terminal, Clear Terminal, and Run Active File commands via xterm.js imperative handles." },
            { icon: <Bug className="w-3.5 h-3.5 text-red-400" />, title: "RUN Menu (DAP Foundation)", desc: "Wired 15+ debug commands into the Command Registry. DAP backend integration in progress." },
        ]
    },
    {
        version: "v1.7.0",
        date: "February 2026",
        tag: "",
        changes: [
            { icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />, title: "GO Menu & Command Palette", desc: "Built 110+ command global Command Palette (Ctrl+Shift+P) with fuzzy search. GO menu wired into Monaco navigation actions." },
            { icon: <FileText className="w-3.5 h-3.5 text-indigo-400" />, title: "VIEW Menu Layout System", desc: "Panel toggles for Explorer, Search, Terminal, AI Chat, and Word Wrap." },
        ]
    },
    {
        version: "v1.6.0",
        date: "February 2026",
        tag: "",
        changes: [
            { icon: <Puzzle className="w-3.5 h-3.5 text-pink-400" />, title: "Extension Import System", desc: "Import VS Code .vsix extensions. UI to browse extension details, features, and changelogs." },
            { icon: <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />, title: "AI Chat Panel with Action Protocol", desc: "AI actions (write_file, run_command) parsed from responses using XML-like structured blocks." },
        ]
    },
    {
        version: "v1.5.0",
        date: "January 2026",
        tag: "",
        changes: [
            { icon: <GitBranch className="w-3.5 h-3.5 text-orange-400" />, title: "Multi-cursor Selection Menu", desc: "Full multi-cursor editing: Add Cursor Above/Below, Add Cursors to Line Ends, Next Occurrence." },
            { icon: <FileText className="w-3.5 h-3.5 text-green-400" />, title: "EDIT Menu with Clipboard API", desc: "Undo, Redo, Cut, Copy, Paste via navigator.clipboard. Find in Files with SearchModal." },
        ]
    },
];

const tagColor: Record<string, string> = {
    latest: "bg-green-500/20 text-green-400 border border-green-500/30",
    stable: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
};

export default function ReleaseNotesPage() {
    return (
        <div className="h-full w-full overflow-y-auto bg-ide-editor px-8 pt-12 pb-20">
            <div className="w-full max-w-2xl mx-auto space-y-10">
                <div>
                    <h1 className="text-2xl font-bold text-ide-text-primary">Release Notes</h1>
                    <p className="text-sm text-ide-text-secondary mt-1">OLLAMA AI — Local AI-powered code editor</p>
                </div>

                {RELEASES.map((release, ri) => (
                    <div key={ri} className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Tag className="w-4 h-4 text-indigo-400" />
                            <span className="text-sm font-bold text-ide-text-primary">{release.version}</span>
                            {release.tag && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tagColor[release.tag]}`}>{release.tag}</span>
                            )}
                            <span className="text-xs text-ide-text-secondary ml-auto">{release.date}</span>
                        </div>
                        <div className="border border-ide-border rounded-xl overflow-hidden divide-y divide-ide-border/60">
                            {release.changes.map((ch, ci) => (
                                <div key={ci} className="flex items-start gap-3 px-4 py-3 hover:bg-ide-hover/40 transition-colors">
                                    <span className="mt-0.5 shrink-0">{ch.icon}</span>
                                    <div>
                                        <div className="text-sm font-medium text-ide-text-primary">{ch.title}</div>
                                        <div className="text-xs text-ide-text-secondary mt-0.5">{ch.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
