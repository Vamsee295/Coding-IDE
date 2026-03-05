import { useState } from 'react';
import {
    X, Search, ChevronDown, ChevronRight,
    FileCode, Palette, AppWindow, Wrench, Settings2 as AppIcon,
    Shield, Puzzle, Type, MousePointer2, Map, Lightbulb,
    FoldVertical, Braces, IndentIncrease, WrapText, Pointer,
    StickyNote, GitCompare, Eye, Navigation, Columns, Sun,
    MonitorSmartphone, Maximize, ZoomIn, PanelTop, LayoutDashboard,
    Menu, Terminal, FolderOpen, SearchIcon, Bug, GitBranch,
    AlertCircle, ListChecks, Bot, Download, Globe, BarChart3,
    Cpu, HardDrive, Lock, FileKey, ShieldAlert, ShieldCheck,
    KeyRound, Zap, Server
} from 'lucide-react';
import { useSettings } from '@/react-app/contexts/SettingsContext';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import SettingRow from '@/react-app/components/settings/SettingRow';
import SettingSection from '@/react-app/components/settings/SettingSection';
import ExtensionsPanel from '@/react-app/components/settings/ExtensionsPanel';

// ─── Sidebar Structure ──────────────────────────────────────────────────────

interface SubPage { id: string; label: string; icon: React.ReactNode; }
interface Category { id: string; label: string; icon: React.ReactNode; subPages: SubPage[]; }

const CATEGORIES: Category[] = [
    {
        id: 'text-editor', label: 'Text Editor', icon: <FileCode className="w-4 h-4" />,
        subPages: [
            { id: 'text-editor.general', label: 'General', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'text-editor.font', label: 'Font', icon: <Type className="w-3.5 h-3.5" /> },
            { id: 'text-editor.formatting', label: 'Formatting', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'text-editor.cursor', label: 'Cursor', icon: <MousePointer2 className="w-3.5 h-3.5" /> },
            { id: 'text-editor.minimap', label: 'Minimap', icon: <Map className="w-3.5 h-3.5" /> },
            { id: 'text-editor.suggestions', label: 'Suggestions', icon: <Lightbulb className="w-3.5 h-3.5" /> },
            { id: 'text-editor.folding', label: 'Code Folding', icon: <FoldVertical className="w-3.5 h-3.5" /> },
            { id: 'text-editor.brackets', label: 'Brackets', icon: <Braces className="w-3.5 h-3.5" /> },
            { id: 'text-editor.indentation', label: 'Indentation', icon: <IndentIncrease className="w-3.5 h-3.5" /> },
            { id: 'text-editor.wordwrap', label: 'Word Wrap', icon: <WrapText className="w-3.5 h-3.5" /> },
            { id: 'text-editor.multicursor', label: 'Multi Cursor', icon: <Pointer className="w-3.5 h-3.5" /> },
            { id: 'text-editor.stickyscroll', label: 'Sticky Scroll', icon: <StickyNote className="w-3.5 h-3.5" /> },
            { id: 'text-editor.diff', label: 'Diff Editor', icon: <GitCompare className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'workbench', label: 'Workbench', icon: <Palette className="w-4 h-4" />,
        subPages: [
            { id: 'workbench.appearance', label: 'Appearance', icon: <Eye className="w-3.5 h-3.5" /> },
            { id: 'workbench.breadcrumbs', label: 'Breadcrumbs', icon: <Navigation className="w-3.5 h-3.5" /> },
            { id: 'workbench.editor', label: 'Editor Management', icon: <Columns className="w-3.5 h-3.5" /> },
            { id: 'workbench.zen', label: 'Zen Mode', icon: <Sun className="w-3.5 h-3.5" /> },
            { id: 'workbench.screencast', label: 'Screencast Mode', icon: <MonitorSmartphone className="w-3.5 h-3.5" /> },
            { id: 'workbench.layout', label: 'Layout', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'window', label: 'Window', icon: <AppWindow className="w-4 h-4" />,
        subPages: [
            { id: 'window.startup', label: 'Startup', icon: <Maximize className="w-3.5 h-3.5" /> },
            { id: 'window.zoom', label: 'Zoom', icon: <ZoomIn className="w-3.5 h-3.5" /> },
            { id: 'window.title', label: 'Window Title', icon: <PanelTop className="w-3.5 h-3.5" /> },
            { id: 'window.menu', label: 'Menu Visibility', icon: <Menu className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'features', label: 'Features', icon: <Wrench className="w-4 h-4" />,
        subPages: [
            { id: 'features.terminal', label: 'Terminal', icon: <Terminal className="w-3.5 h-3.5" /> },
            { id: 'features.explorer', label: 'Explorer', icon: <FolderOpen className="w-3.5 h-3.5" /> },
            { id: 'features.search', label: 'Search', icon: <SearchIcon className="w-3.5 h-3.5" /> },
            { id: 'features.debug', label: 'Debug', icon: <Bug className="w-3.5 h-3.5" /> },
            { id: 'features.sourcecontrol', label: 'Source Control', icon: <GitBranch className="w-3.5 h-3.5" /> },
            { id: 'features.problems', label: 'Problems', icon: <AlertCircle className="w-3.5 h-3.5" /> },
            { id: 'features.tasks', label: 'Tasks', icon: <ListChecks className="w-3.5 h-3.5" /> },
            { id: 'features.ai', label: 'AI Assistant', icon: <Bot className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'application', label: 'Application', icon: <AppIcon className="w-4 h-4" />,
        subPages: [
            { id: 'application.updates', label: 'Updates', icon: <Download className="w-3.5 h-3.5" /> },
            { id: 'application.language', label: 'Language', icon: <Globe className="w-3.5 h-3.5" /> },
            { id: 'application.telemetry', label: 'Telemetry', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'application.performance', label: 'Performance', icon: <Cpu className="w-3.5 h-3.5" /> },
            { id: 'application.storage', label: 'Storage', icon: <HardDrive className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" />,
        subPages: [
            { id: 'security.trust', label: 'Workspace Trust', icon: <Lock className="w-3.5 h-3.5" /> },
            { id: 'security.fileaccess', label: 'File Access', icon: <FileKey className="w-3.5 h-3.5" /> },
            { id: 'security.terminal', label: 'Terminal Security', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
            { id: 'security.ai', label: 'AI Safety', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'security.extensions', label: 'Extension Permissions', icon: <KeyRound className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'extensions', label: 'Extensions', icon: <Puzzle className="w-4 h-4" />,
        subPages: []
    },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SettingsView() {
    const { settings, updateSettings, resetSettings, isSettingsOpen, setIsSettingsOpen, settingsTab, setSettingsTab } = useSettings();
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['text-editor', 'features']));
    const [searchQuery, setSearchQuery] = useState('');

    if (!isSettingsOpen) return null;

    const toggleCategory = (id: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSelectTab = (tabId: string) => {
        setSettingsTab(tabId);
        // Auto-expand parent category
        const cat = tabId.split('.')[0];
        setExpandedCategories(prev => new Set([...prev, cat]));
    };

    // Active category + subpage info
    const activeCategory = CATEGORIES.find(c => settingsTab.startsWith(c.id));
    const activeSubPage = activeCategory?.subPages.find(sp => sp.id === settingsTab);
    const pageTitle = activeSubPage?.label || activeCategory?.label || 'Settings';

    // Ollama connection test
    const handleTestConnection = async () => {
        try {
            const res = await fetch(`${settings.ollamaEndpoint}/api/tags`);
            alert(res.ok ? "✅ Connected to Ollama successfully!" : "❌ Failed to connect.");
        } catch (e: any) {
            alert(`❌ Error: ${e.message}`);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex bg-ide-bg/80 backdrop-blur-sm">
            <div className="w-full max-w-6xl mx-auto my-6 flex rounded-xl border border-ide-border bg-ide-sidebar shadow-2xl overflow-hidden">

                {/* ── SIDEBAR ── */}
                <div className="w-64 flex-shrink-0 border-r border-ide-border bg-[rgba(15,17,26,0.6)] flex flex-col">
                    {/* Header + search */}
                    <div className="p-4 pb-3 flex-shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-semibold text-ide-text-secondary uppercase tracking-widest">Settings</h2>
                            <Button
                                variant="ghost" size="icon"
                                onClick={() => setIsSettingsOpen(false)}
                                className="h-6 w-6 text-ide-text-secondary hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-text-secondary" />
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search settings…"
                                className="h-8 pl-8 text-xs bg-[rgba(15,17,26,0.5)] border-ide-border/50 focus-visible:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
                        {CATEGORIES.map(cat => {
                            const isExpanded = expandedCategories.has(cat.id);
                            const isActiveCategory = settingsTab.startsWith(cat.id);
                            const hasSubPages = cat.subPages.length > 0;

                            // Filter by search
                            if (searchQuery) {
                                const q = searchQuery.toLowerCase();
                                const catMatch = cat.label.toLowerCase().includes(q);
                                const subMatches = cat.subPages.filter(sp => sp.label.toLowerCase().includes(q));
                                if (!catMatch && subMatches.length === 0) return null;
                            }

                            return (
                                <div key={cat.id}>
                                    <button
                                        onClick={() => {
                                            if (hasSubPages) {
                                                toggleCategory(cat.id);
                                                if (!isExpanded) handleSelectTab(cat.subPages[0].id);
                                            } else {
                                                handleSelectTab(cat.id);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all ${isActiveCategory && !hasSubPages
                                                ? 'bg-indigo-500/15 text-indigo-300'
                                                : isActiveCategory
                                                    ? 'text-ide-text-primary'
                                                    : 'text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover/50'
                                            }`}
                                    >
                                        <span className={isActiveCategory ? 'text-indigo-400' : ''}>{cat.icon}</span>
                                        <span className="flex-1 text-left">{cat.label}</span>
                                        {hasSubPages && (
                                            <span className="text-ide-text-secondary">
                                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                            </span>
                                        )}
                                    </button>

                                    {/* Sub-pages */}
                                    {hasSubPages && isExpanded && (
                                        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-ide-border/30 pl-2">
                                            {cat.subPages.map(sp => {
                                                if (searchQuery && !sp.label.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                                                const isActive = settingsTab === sp.id;
                                                return (
                                                    <button
                                                        key={sp.id}
                                                        onClick={() => handleSelectTab(sp.id)}
                                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${isActive
                                                                ? 'bg-indigo-500/15 text-indigo-300 font-medium'
                                                                : 'text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover/40'
                                                            }`}
                                                    >
                                                        <span className={isActive ? 'text-indigo-400' : 'opacity-60'}>{sp.icon}</span>
                                                        {sp.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Reset button */}
                    <div className="p-3 border-t border-ide-border/40 flex-shrink-0">
                        <Button
                            variant="ghost"
                            onClick={resetSettings}
                            className="w-full h-8 text-xs text-ide-text-secondary hover:text-red-400 hover:bg-red-500/10"
                        >
                            Reset All Settings
                        </Button>
                    </div>
                </div>

                {/* ── CONTENT ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-ide-editor">
                    {/* Header */}
                    <div className="px-8 pt-6 pb-4 border-b border-ide-border flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs text-ide-text-secondary mb-1">
                            {activeCategory && <span>{activeCategory.label}</span>}
                            {activeSubPage && <><ChevronRight className="w-3 h-3" /><span>{activeSubPage.label}</span></>}
                        </div>
                        <h1 className="text-xl font-bold text-ide-text-primary">{pageTitle}</h1>
                    </div>

                    {/* Settings Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        <div className="max-w-3xl space-y-2">

                            {/* ════════════════ TEXT EDITOR ════════════════ */}

                            {settingsTab === 'text-editor.general' && (
                                <SettingSection icon={<FileCode className="w-4 h-4" />} title="General">
                                    <SettingRow type="number" label="Tab Size" description="The number of spaces a tab is equal to." value={settings.tabSize} min={1} max={8} onChange={v => updateSettings({ tabSize: v })} />
                                    <SettingRow type="toggle" label="Insert Spaces" description="Insert spaces when pressing Tab." value={settings.insertSpaces} onChange={v => updateSettings({ insertSpaces: v })} />
                                    <SettingRow type="toggle" label="Auto Save" description="Automatically save files after a delay." value={settings.autoSave} onChange={v => updateSettings({ autoSave: v })} />
                                    <SettingRow type="number" label="Auto Save Delay" description="Delay in milliseconds before auto-saving." value={settings.autoSaveDelay} min={100} max={10000} step={100} onChange={v => updateSettings({ autoSaveDelay: v })} />
                                    <SettingRow type="toggle" label="Line Numbers" description="Controls the display of line numbers." value={settings.lineNumbers} onChange={v => updateSettings({ lineNumbers: v })} />
                                    <SettingRow type="select" label="Render Whitespace" description="Controls how whitespace is rendered." value={settings.renderWhitespace} options={[
                                        { label: 'None', value: 'none' },
                                        { label: 'Boundary', value: 'boundary' },
                                        { label: 'Selection', value: 'selection' },
                                        { label: 'Trailing', value: 'trailing' },
                                        { label: 'All', value: 'all' },
                                    ]} onChange={v => updateSettings({ renderWhitespace: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.font' && (
                                <SettingSection icon={<Type className="w-4 h-4" />} title="Font">
                                    <SettingRow type="select" label="Font Family" description="Controls the font family used in the editor." value={settings.fontFamily} options={[
                                        { label: 'JetBrains Mono', value: "'JetBrains Mono', 'Fira Code', monospace" },
                                        { label: 'Fira Code', value: "'Fira Code', monospace" },
                                        { label: 'Cascadia Code', value: "'Cascadia Code', monospace" },
                                        { label: 'Consolas', value: "'Consolas', monospace" },
                                        { label: 'Source Code Pro', value: "'Source Code Pro', monospace" },
                                        { label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace" },
                                    ]} onChange={v => updateSettings({ fontFamily: v })} />
                                    <SettingRow type="slider" label="Font Size" description="Controls the editor font size in pixels." value={settings.fontSize} min={10} max={28} unit="px" onChange={v => updateSettings({ fontSize: v })} />
                                    <SettingRow type="toggle" label="Font Ligatures" description="Enables/disables font ligatures (e.g., => becomes ⇒)." value={settings.fontLigatures} onChange={v => updateSettings({ fontLigatures: v })} />
                                    <SettingRow type="slider" label="Line Height" description="Controls the line height." value={settings.lineHeight} min={1} max={3} step={0.1} onChange={v => updateSettings({ lineHeight: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.formatting' && (
                                <SettingSection icon={<FileCode className="w-4 h-4" />} title="Formatting">
                                    <SettingRow type="toggle" label="Format On Save" description="Format code file each time it is saved." value={settings.formatOnSave} onChange={v => updateSettings({ formatOnSave: v })} />
                                    <SettingRow type="toggle" label="Format On Paste" description="Format pasted content automatically." value={settings.formatOnPaste} onChange={v => updateSettings({ formatOnPaste: v })} />
                                    <SettingRow type="select" label="Default Formatter" description="Select the default code formatter." value={settings.defaultFormatter} options={[
                                        { label: 'Prettier', value: 'prettier' },
                                        { label: 'ESLint', value: 'eslint' },
                                        { label: 'None', value: 'none' },
                                    ]} onChange={v => updateSettings({ defaultFormatter: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.cursor' && (
                                <SettingSection icon={<MousePointer2 className="w-4 h-4" />} title="Cursor">
                                    <SettingRow type="select" label="Cursor Style" description="Controls the cursor shape." value={settings.cursorStyle} options={[
                                        { label: 'Line', value: 'line' },
                                        { label: 'Block', value: 'block' },
                                        { label: 'Underline', value: 'underline' },
                                        { label: 'Line Thin', value: 'line-thin' },
                                        { label: 'Block Outline', value: 'block-outline' },
                                        { label: 'Underline Thin', value: 'underline-thin' },
                                    ]} onChange={v => updateSettings({ cursorStyle: v })} />
                                    <SettingRow type="select" label="Cursor Blinking" description="Controls the cursor animation style." value={settings.cursorBlinking} options={[
                                        { label: 'Blink', value: 'blink' },
                                        { label: 'Smooth', value: 'smooth' },
                                        { label: 'Phase', value: 'phase' },
                                        { label: 'Expand', value: 'expand' },
                                        { label: 'Solid', value: 'solid' },
                                    ]} onChange={v => updateSettings({ cursorBlinking: v })} />
                                    <SettingRow type="toggle" label="Smooth Caret Animation" description="Enables smooth cursor animation." value={settings.cursorSmoothCaret} onChange={v => updateSettings({ cursorSmoothCaret: v })} />
                                    <SettingRow type="number" label="Cursor Width" description="Width of the cursor in pixels." value={settings.cursorWidth} min={1} max={5} onChange={v => updateSettings({ cursorWidth: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.minimap' && (
                                <SettingSection icon={<Map className="w-4 h-4" />} title="Minimap">
                                    <SettingRow type="toggle" label="Enabled" description="Show the minimap code preview." value={settings.minimap} onChange={v => updateSettings({ minimap: v })} />
                                    <SettingRow type="slider" label="Scale" description="Scale of the minimap." value={settings.minimapScale} min={1} max={3} onChange={v => updateSettings({ minimapScale: v })} />
                                    <SettingRow type="number" label="Max Column" description="Limit the width of the minimap." value={settings.minimapMaxColumn} min={40} max={300} step={10} onChange={v => updateSettings({ minimapMaxColumn: v })} />
                                    <SettingRow type="toggle" label="Render Characters" description="Render actual characters in the minimap." value={settings.minimapRenderChars} onChange={v => updateSettings({ minimapRenderChars: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.suggestions' && (
                                <SettingSection icon={<Lightbulb className="w-4 h-4" />} title="Suggestions">
                                    <SettingRow type="toggle" label="Suggest On Trigger Characters" description="Show suggestions when trigger characters are typed." value={settings.suggestOnTriggerCharacters} onChange={v => updateSettings({ suggestOnTriggerCharacters: v })} />
                                    <SettingRow type="toggle" label="Quick Suggestions" description="Enable suggestions while typing." value={settings.quickSuggestions} onChange={v => updateSettings({ quickSuggestions: v })} />
                                    <SettingRow type="toggle" label="Inline Suggestions" description="Show ghost-text inline completions." value={settings.inlineSuggestions} onChange={v => updateSettings({ inlineSuggestions: v })} />
                                    <SettingRow type="select" label="Accept Suggestion On Enter" description="Accept suggestions with Enter key." value={settings.acceptSuggestionOnEnter} options={[
                                        { label: 'On', value: 'on' },
                                        { label: 'Smart', value: 'smart' },
                                        { label: 'Off', value: 'off' },
                                    ]} onChange={v => updateSettings({ acceptSuggestionOnEnter: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.folding' && (
                                <SettingSection icon={<FoldVertical className="w-4 h-4" />} title="Code Folding">
                                    <SettingRow type="toggle" label="Folding" description="Enable code folding." value={settings.codeFolding} onChange={v => updateSettings({ codeFolding: v })} />
                                    <SettingRow type="select" label="Folding Strategy" description="Select the folding strategy." value={settings.foldingStrategy} options={[
                                        { label: 'Auto', value: 'auto' },
                                        { label: 'Indentation', value: 'indentation' },
                                    ]} onChange={v => updateSettings({ foldingStrategy: v })} />
                                    <SettingRow type="select" label="Show Folding Controls" description="When to show folding controls." value={settings.showFoldingControls} options={[
                                        { label: 'Always', value: 'always' },
                                        { label: 'Mouse Over', value: 'mouseover' },
                                        { label: 'Never', value: 'never' },
                                    ]} onChange={v => updateSettings({ showFoldingControls: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.brackets' && (
                                <SettingSection icon={<Braces className="w-4 h-4" />} title="Brackets">
                                    <SettingRow type="select" label="Auto Close Brackets" description="Controls auto-closing of brackets." value={settings.autoCloseBrackets} options={[
                                        { label: 'Always', value: 'always' },
                                        { label: 'Language Defined', value: 'languageDefined' },
                                        { label: 'Before Whitespace', value: 'beforeWhitespace' },
                                        { label: 'Never', value: 'never' },
                                    ]} onChange={v => updateSettings({ autoCloseBrackets: v })} />
                                    <SettingRow type="toggle" label="Bracket Pair Colorization" description="Color matching bracket pairs." value={settings.bracketPairColorization} onChange={v => updateSettings({ bracketPairColorization: v })} />
                                    <SettingRow type="toggle" label="Bracket Pair Guides" description="Show bracket pair guides." value={settings.bracketPairGuides} onChange={v => updateSettings({ bracketPairGuides: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.indentation' && (
                                <SettingSection icon={<IndentIncrease className="w-4 h-4" />} title="Indentation">
                                    <SettingRow type="toggle" label="Detect Indentation" description="Auto-detect tab/spaces from file content." value={settings.detectIndentation} onChange={v => updateSettings({ detectIndentation: v })} />
                                    <SettingRow type="select" label="Auto Indent" description="Controls automatic indentation." value={settings.autoIndent} options={[
                                        { label: 'None', value: 'none' },
                                        { label: 'Keep', value: 'keep' },
                                        { label: 'Brackets', value: 'brackets' },
                                        { label: 'Advanced', value: 'advanced' },
                                        { label: 'Full', value: 'full' },
                                    ]} onChange={v => updateSettings({ autoIndent: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.wordwrap' && (
                                <SettingSection icon={<WrapText className="w-4 h-4" />} title="Word Wrap">
                                    <SettingRow type="toggle" label="Word Wrap" description="Wrap long lines at viewport or column." value={settings.wordWrap} onChange={v => updateSettings({ wordWrap: v })} />
                                    <SettingRow type="number" label="Word Wrap Column" description="Wrap at this column when word wrap is enabled." value={settings.wordWrapColumn} min={40} max={200} step={10} onChange={v => updateSettings({ wordWrapColumn: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.multicursor' && (
                                <SettingSection icon={<Pointer className="w-4 h-4" />} title="Multi Cursor">
                                    <SettingRow type="select" label="Multi Cursor Modifier" description="Modifier key for adding cursors." value={settings.multiCursorModifier} options={[
                                        { label: 'Alt', value: 'alt' },
                                        { label: 'Ctrl / Cmd', value: 'ctrlCmd' },
                                    ]} onChange={v => updateSettings({ multiCursorModifier: v })} />
                                    <SettingRow type="select" label="Multi Cursor Paste" description="Controls pasting with multiple cursors." value={settings.multiCursorPaste} options={[
                                        { label: 'Spread', value: 'spread' },
                                        { label: 'Full', value: 'full' },
                                    ]} onChange={v => updateSettings({ multiCursorPaste: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.stickyscroll' && (
                                <SettingSection icon={<StickyNote className="w-4 h-4" />} title="Sticky Scroll">
                                    <SettingRow type="toggle" label="Sticky Scroll" description="Show current scope at the top of the editor." value={settings.stickyScroll} onChange={v => updateSettings({ stickyScroll: v })} />
                                    <SettingRow type="number" label="Max Lines" description="Maximum number of sticky lines." value={settings.stickyScrollMaxLines} min={1} max={10} onChange={v => updateSettings({ stickyScrollMaxLines: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.diff' && (
                                <SettingSection icon={<GitCompare className="w-4 h-4" />} title="Diff Editor">
                                    <SettingRow type="toggle" label="Side by Side" description="Show diff in side-by-side view." value={settings.diffEditorSideBySide} onChange={v => updateSettings({ diffEditorSideBySide: v })} />
                                    <SettingRow type="toggle" label="Ignore Whitespace" description="Ignore whitespace changes in diff." value={settings.diffEditorIgnoreWhitespace} onChange={v => updateSettings({ diffEditorIgnoreWhitespace: v })} />
                                </SettingSection>
                            )}

                            {/* ════════════════ WORKBENCH ════════════════ */}

                            {settingsTab === 'workbench.appearance' && (
                                <SettingSection icon={<Eye className="w-4 h-4" />} title="Appearance">
                                    <SettingRow type="select" label="Color Theme" description="Select the IDE color theme." value={settings.theme} options={[
                                        { label: 'Deep Night', value: 'deep-night' },
                                        { label: 'Snowy Studio (Light)', value: 'snowy-studio' },
                                        { label: 'Catppuccin Mocha', value: 'catppuccin-mocha' },
                                        { label: 'Dracula', value: 'dracula' },
                                        { label: 'One Dark Pro', value: 'one-dark-pro' },
                                    ]} onChange={v => updateSettings({ theme: v })} />
                                    <SettingRow type="select" label="Icon Theme" description="Select the file icon theme." value={settings.iconTheme} options={[
                                        { label: 'Material Icon Theme', value: 'material-icon-theme' },
                                        { label: 'VS Code Icons', value: 'vscode-icons' },
                                        { label: 'None', value: 'none' },
                                    ]} onChange={v => updateSettings({ iconTheme: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.breadcrumbs' && (
                                <SettingSection icon={<Navigation className="w-4 h-4" />} title="Breadcrumbs">
                                    <SettingRow type="toggle" label="Enable Breadcrumbs" description="Show breadcrumb navigation above the editor." value={settings.breadcrumbs} onChange={v => updateSettings({ breadcrumbs: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.editor' && (
                                <SettingSection icon={<Columns className="w-4 h-4" />} title="Editor Management">
                                    <SettingRow type="toggle" label="Enable Preview" description="Preview files on single click (close when opening another)." value={settings.editorPreviewMode} onChange={v => updateSettings({ editorPreviewMode: v })} />
                                    <SettingRow type="select" label="Tab Close Button" description="Position of the close button on tabs." value={settings.editorTabCloseButton} options={[
                                        { label: 'Right', value: 'right' },
                                        { label: 'Left', value: 'left' },
                                        { label: 'Off', value: 'off' },
                                    ]} onChange={v => updateSettings({ editorTabCloseButton: v })} />
                                    <SettingRow type="toggle" label="Open Side by Side" description="Open new editors beside the current one." value={settings.editorOpenSideBySide} onChange={v => updateSettings({ editorOpenSideBySide: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.zen' && (
                                <SettingSection icon={<Sun className="w-4 h-4" />} title="Zen Mode">
                                    <SettingRow type="toggle" label="Zen Mode" description="Enable distraction-free coding mode." value={settings.zenMode} onChange={v => updateSettings({ zenMode: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.screencast' && (
                                <SettingSection icon={<MonitorSmartphone className="w-4 h-4" />} title="Screencast Mode">
                                    <SettingRow type="toggle" label="Screencast Mode" description="Show keyboard shortcuts on screen (for presentations)." value={settings.screencastMode} onChange={v => updateSettings({ screencastMode: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.layout' && (
                                <SettingSection icon={<LayoutDashboard className="w-4 h-4" />} title="Layout">
                                    <SettingRow type="select" label="Sidebar Position" description="Position of the sidebar." value={settings.layoutSidebarPosition} options={[
                                        { label: 'Left', value: 'left' },
                                        { label: 'Right', value: 'right' },
                                    ]} onChange={v => updateSettings({ layoutSidebarPosition: v })} />
                                    <SettingRow type="toggle" label="Activity Bar Visible" description="Show the activity bar." value={settings.layoutActivityBarVisible} onChange={v => updateSettings({ layoutActivityBarVisible: v })} />
                                    <SettingRow type="toggle" label="Status Bar Visible" description="Show the status bar." value={settings.layoutStatusBarVisible} onChange={v => updateSettings({ layoutStatusBarVisible: v })} />
                                </SettingSection>
                            )}

                            {/* ════════════════ WINDOW ════════════════ */}

                            {settingsTab === 'window.startup' && (
                                <SettingSection icon={<Maximize className="w-4 h-4" />} title="Startup">
                                    <SettingRow type="select" label="Restore Windows" description="Controls how windows are restored after restart." value={settings.restoreWindows} options={[
                                        { label: 'All', value: 'all' },
                                        { label: 'Folders', value: 'folders' },
                                        { label: 'One', value: 'one' },
                                        { label: 'None', value: 'none' },
                                    ]} onChange={v => updateSettings({ restoreWindows: v })} />
                                    <SettingRow type="select" label="New Window Dimensions" description="Size of new windows." value={settings.newWindowDimensions} options={[
                                        { label: 'Default', value: 'default' },
                                        { label: 'Inherit', value: 'inherit' },
                                        { label: 'Offset', value: 'offset' },
                                        { label: 'Maximized', value: 'maximized' },
                                        { label: 'Fullscreen', value: 'fullscreen' },
                                    ]} onChange={v => updateSettings({ newWindowDimensions: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'window.zoom' && (
                                <SettingSection icon={<ZoomIn className="w-4 h-4" />} title="Zoom">
                                    <SettingRow type="slider" label="Zoom Level" description="Controls the overall UI zoom level." value={settings.zoomLevel} min={-3} max={5} step={0.5} onChange={v => updateSettings({ zoomLevel: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'window.title' && (
                                <SettingSection icon={<PanelTop className="w-4 h-4" />} title="Window Title">
                                    <SettingRow type="select" label="Title Bar Style" description="Controls the title bar style." value={settings.titleBarStyle} options={[
                                        { label: 'Custom', value: 'custom' },
                                        { label: 'Native', value: 'native' },
                                    ]} onChange={v => updateSettings({ titleBarStyle: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'window.menu' && (
                                <SettingSection icon={<Menu className="w-4 h-4" />} title="Menu Visibility">
                                    <SettingRow type="select" label="Menu Bar Visibility" description="Controls menu bar visibility." value={settings.menuBarVisibility} options={[
                                        { label: 'Visible', value: 'visible' },
                                        { label: 'Toggle', value: 'toggle' },
                                        { label: 'Hidden', value: 'hidden' },
                                        { label: 'Compact', value: 'compact' },
                                    ]} onChange={v => updateSettings({ menuBarVisibility: v })} />
                                </SettingSection>
                            )}

                            {/* ════════════════ FEATURES ════════════════ */}

                            {settingsTab === 'features.terminal' && (
                                <SettingSection icon={<Terminal className="w-4 h-4" />} title="Terminal">
                                    <SettingRow type="slider" label="Font Size" description="Controls terminal font size." value={settings.terminalFontSize} min={8} max={24} unit="px" onChange={v => updateSettings({ terminalFontSize: v })} />
                                    <SettingRow type="select" label="Font Family" description="Terminal font family." value={settings.terminalFontFamily} options={[
                                        { label: 'Cascadia Code', value: "'Cascadia Code', 'Fira Code', monospace" },
                                        { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
                                        { label: 'Fira Code', value: "'Fira Code', monospace" },
                                        { label: 'Consolas', value: "'Consolas', monospace" },
                                    ]} onChange={v => updateSettings({ terminalFontFamily: v })} />
                                    <SettingRow type="toggle" label="Cursor Blinking" description="Enable cursor blinking in terminal." value={settings.terminalCursorBlinking} onChange={v => updateSettings({ terminalCursorBlinking: v })} />
                                    <SettingRow type="select" label="Cursor Style" description="Terminal cursor shape." value={settings.terminalCursorStyle} options={[
                                        { label: 'Bar', value: 'bar' },
                                        { label: 'Block', value: 'block' },
                                        { label: 'Underline', value: 'underline' },
                                    ]} onChange={v => updateSettings({ terminalCursorStyle: v })} />
                                    <SettingRow type="select" label="Default Profile" description="Default shell profile." value={settings.terminalDefaultProfile} options={[
                                        { label: 'PowerShell', value: 'PowerShell' },
                                        { label: 'Git Bash', value: 'Git Bash' },
                                        { label: 'Command Prompt', value: 'Command Prompt' },
                                        { label: 'WSL', value: 'Ubuntu (WSL)' },
                                    ]} onChange={v => updateSettings({ terminalDefaultProfile: v })} />
                                    <SettingRow type="number" label="Scrollback" description="Number of lines kept in terminal buffer." value={settings.terminalScrollback} min={1000} max={100000} step={1000} onChange={v => updateSettings({ terminalScrollback: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.explorer' && (
                                <SettingSection icon={<FolderOpen className="w-4 h-4" />} title="Explorer">
                                    <SettingRow type="toggle" label="Auto Reveal" description="Reveal file in explorer when opened." value={settings.explorerAutoReveal} onChange={v => updateSettings({ explorerAutoReveal: v })} />
                                    <SettingRow type="select" label="Sort Order" description="File sort order in explorer." value={settings.explorerSortOrder} options={[
                                        { label: 'Default', value: 'default' },
                                        { label: 'Mixed', value: 'mixed' },
                                        { label: 'Files First', value: 'filesFirst' },
                                        { label: 'Type', value: 'type' },
                                        { label: 'Modified', value: 'modified' },
                                    ]} onChange={v => updateSettings({ explorerSortOrder: v })} />
                                    <SettingRow type="toggle" label="Compact Folders" description="Render single-child folders inline." value={settings.explorerCompactFolders} onChange={v => updateSettings({ explorerCompactFolders: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.search' && (
                                <SettingSection icon={<SearchIcon className="w-4 h-4" />} title="Search">
                                    <SettingRow type="input" label="Exclude Pattern" description="Glob patterns to exclude from search." value={settings.searchExcludePattern} onChange={v => updateSettings({ searchExcludePattern: v })} />
                                    <SettingRow type="toggle" label="Use Ignore Files" description="Respect .gitignore and .ignore files." value={settings.searchUseIgnoreFiles} onChange={v => updateSettings({ searchUseIgnoreFiles: v })} />
                                    <SettingRow type="toggle" label="Smart Case" description="Case-insensitive unless uppercase is used." value={settings.searchSmartCase} onChange={v => updateSettings({ searchSmartCase: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.debug' && (
                                <SettingSection icon={<Bug className="w-4 h-4" />} title="Debug">
                                    <SettingRow type="select" label="Open On Start" description="When to open the debug view." value={settings.debugOpenOnStart} options={[
                                        { label: 'On First Session', value: 'openOnFirstSessionStart' },
                                        { label: 'On Every Session', value: 'openOnSessionStart' },
                                        { label: 'Never', value: 'neverOpen' },
                                    ]} onChange={v => updateSettings({ debugOpenOnStart: v })} />
                                    <SettingRow type="toggle" label="Inline Values" description="Show variable values inline during debugging." value={settings.debugInlineValues} onChange={v => updateSettings({ debugInlineValues: v })} />
                                    <SettingRow type="select" label="Toolbar Location" description="Debug toolbar position." value={settings.debugToolBarLocation} options={[
                                        { label: 'Floating', value: 'floating' },
                                        { label: 'Docked', value: 'docked' },
                                        { label: 'Hidden', value: 'hidden' },
                                    ]} onChange={v => updateSettings({ debugToolBarLocation: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.sourcecontrol' && (
                                <SettingSection icon={<GitBranch className="w-4 h-4" />} title="Source Control">
                                    <SettingRow type="toggle" label="Auto Fetch" description="Periodically fetch from remotes." value={settings.sourceControlAutoFetch} onChange={v => updateSettings({ sourceControlAutoFetch: v })} />
                                    <SettingRow type="toggle" label="Auto Refresh" description="Auto-refresh the source control view." value={settings.sourceControlAutoRefresh} onChange={v => updateSettings({ sourceControlAutoRefresh: v })} />
                                    <SettingRow type="select" label="Diff Decorations" description="Show diff decorations in the editor gutter." value={settings.sourceControlDiffDecorations} options={[
                                        { label: 'All', value: 'all' },
                                        { label: 'Gutter', value: 'gutter' },
                                        { label: 'Overview', value: 'overview' },
                                        { label: 'Minimap', value: 'minimap' },
                                        { label: 'None', value: 'none' },
                                    ]} onChange={v => updateSettings({ sourceControlDiffDecorations: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.problems' && (
                                <SettingSection icon={<AlertCircle className="w-4 h-4" />} title="Problems">
                                    <SettingRow type="toggle" label="Auto Reveal" description="Reveal problems on file open." value={settings.problemsAutoReveal} onChange={v => updateSettings({ problemsAutoReveal: v })} />
                                    <SettingRow type="toggle" label="Show Current File Only" description="Filter problems to current file." value={settings.problemsShowCurrentOnly} onChange={v => updateSettings({ problemsShowCurrentOnly: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.tasks' && (
                                <SettingSection icon={<ListChecks className="w-4 h-4" />} title="Tasks">
                                    <SettingRow type="select" label="Auto Detect" description="Auto-detect build tasks (npm, make, etc.)." value={settings.taskAutoDetect} options={[
                                        { label: 'On', value: 'on' },
                                        { label: 'Off', value: 'off' },
                                    ]} onChange={v => updateSettings({ taskAutoDetect: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.ai' && (
                                <>
                                    <SettingSection icon={<Bot className="w-4 h-4" />} title="AI Assistant">
                                        <SettingRow type="select" label="Active Model" description="Ollama model for code generation." value={settings.aiModel} options={[
                                            { label: 'Qwen 2.5 Coder 7B', value: 'qwen2.5-coder:7b' },
                                            { label: 'Qwen 2.5 Coder 14B', value: 'qwen2.5-coder:14b' },
                                            { label: 'Llama 3 8B', value: 'llama3:8b' },
                                            { label: 'Code Llama 7B', value: 'codellama:7b' },
                                            { label: 'DeepSeek Coder 6.7B', value: 'deepseek-coder:6.7b' },
                                            { label: 'Mistral 7B', value: 'mistral:7b' },
                                        ]} onChange={v => updateSettings({ aiModel: v })} />
                                        <SettingRow type="slider" label="Temperature" description="Controls randomness. Lower = more precise." value={settings.aiTemperature} min={0} max={1} step={0.05} onChange={v => updateSettings({ aiTemperature: v })} />
                                        <SettingRow type="number" label="Context Window" description="Max tokens for AI context." value={settings.aiContextWindow} min={2048} max={128000} step={1024} onChange={v => updateSettings({ aiContextWindow: v })} />
                                        <SettingRow type="toggle" label="Contextual Awareness" description="Index local files for better AI context." value={settings.contextualAwareness} onChange={v => updateSettings({ contextualAwareness: v })} />
                                        <SettingRow type="toggle" label="Streaming Response" description="Stream AI output in real-time." value={settings.streamingResponse} onChange={v => updateSettings({ streamingResponse: v })} />
                                        <SettingRow type="toggle" label="Safety Mode" description="Block potentially dangerous AI commands." value={settings.aiSafetyMode} onChange={v => updateSettings({ aiSafetyMode: v })} />
                                    </SettingSection>
                                    <SettingSection icon={<Server className="w-4 h-4" />} title="Ollama Connection">
                                        <SettingRow type="input" label="Endpoint URL" description="URL of your Ollama server." value={settings.ollamaEndpoint} onChange={v => updateSettings({ ollamaEndpoint: v })} />
                                        <div className="py-2 px-1">
                                            <Button onClick={handleTestConnection} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-4">
                                                <Zap className="w-3.5 h-3.5 mr-1.5" /> Test Connection
                                            </Button>
                                        </div>
                                    </SettingSection>
                                </>
                            )}

                            {/* ════════════════ APPLICATION ════════════════ */}

                            {settingsTab === 'application.updates' && (
                                <SettingSection icon={<Download className="w-4 h-4" />} title="Updates">
                                    <SettingRow type="toggle" label="Auto Update" description="Automatically download and install updates." value={settings.autoUpdate} onChange={v => updateSettings({ autoUpdate: v })} />
                                    <SettingRow type="select" label="Update Channel" description="Release channel for updates." value={settings.updateChannel} options={[
                                        { label: 'Stable', value: 'stable' },
                                        { label: 'Insider', value: 'insider' },
                                    ]} onChange={v => updateSettings({ updateChannel: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'application.language' && (
                                <SettingSection icon={<Globe className="w-4 h-4" />} title="Language">
                                    <SettingRow type="select" label="Display Language" description="IDE interface language." value={settings.language} options={[
                                        { label: 'English', value: 'en' },
                                        { label: 'Chinese (Simplified)', value: 'zh-CN' },
                                        { label: 'Japanese', value: 'ja' },
                                        { label: 'Korean', value: 'ko' },
                                        { label: 'French', value: 'fr' },
                                        { label: 'German', value: 'de' },
                                        { label: 'Spanish', value: 'es' },
                                        { label: 'Portuguese', value: 'pt' },
                                    ]} onChange={v => updateSettings({ language: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'application.telemetry' && (
                                <SettingSection icon={<BarChart3 className="w-4 h-4" />} title="Telemetry">
                                    <SettingRow type="toggle" label="Enable Telemetry" description="Allow anonymous usage data collection." value={settings.telemetry} onChange={v => updateSettings({ telemetry: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'application.performance' && (
                                <SettingSection icon={<Cpu className="w-4 h-4" />} title="Performance">
                                    <SettingRow type="toggle" label="Performance Mode" description="Reduce visual effects for better performance." value={settings.performanceMode} onChange={v => updateSettings({ performanceMode: v })} />
                                    <SettingRow type="number" label="Max Memory (MB)" description="Maximum memory allocation." value={settings.maxMemory} min={1024} max={32768} step={512} onChange={v => updateSettings({ maxMemory: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'application.storage' && (
                                <SettingSection icon={<HardDrive className="w-4 h-4" />} title="Storage">
                                    <SettingRow type="toggle" label="Auto Cleanup" description="Automatically clean old cache and logs." value={settings.storageAutoCleanup} onChange={v => updateSettings({ storageAutoCleanup: v })} />
                                </SettingSection>
                            )}

                            {/* ════════════════ SECURITY ════════════════ */}

                            {settingsTab === 'security.trust' && (
                                <SettingSection icon={<Lock className="w-4 h-4" />} title="Workspace Trust">
                                    <SettingRow type="toggle" label="Enable Workspace Trust" description="Restrict capabilities in untrusted workspaces." value={settings.workspaceTrust} onChange={v => updateSettings({ workspaceTrust: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'security.fileaccess' && (
                                <SettingSection icon={<FileKey className="w-4 h-4" />} title="File Access">
                                    <SettingRow type="toggle" label="Restricted File Access" description="Limit file system access to workspace folders." value={settings.fileAccessRestricted} onChange={v => updateSettings({ fileAccessRestricted: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'security.terminal' && (
                                <SettingSection icon={<ShieldAlert className="w-4 h-4" />} title="Terminal Security">
                                    <SettingRow type="toggle" label="Confirm Paste" description="Show confirmation before pasting into terminal." value={settings.terminalSecurityConfirmPaste} onChange={v => updateSettings({ terminalSecurityConfirmPaste: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'security.ai' && (
                                <SettingSection icon={<ShieldCheck className="w-4 h-4" />} title="AI Safety">
                                    <SettingRow type="toggle" label="Block Dangerous Commands" description="Prevent AI from suggesting destructive operations." value={settings.aiSafetyBlocking} onChange={v => updateSettings({ aiSafetyBlocking: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'security.extensions' && (
                                <SettingSection icon={<KeyRound className="w-4 h-4" />} title="Extension Permissions">
                                    <SettingRow type="toggle" label="Permission Prompt" description="Prompt before granting extension permissions." value={settings.extensionPermissionPrompt} onChange={v => updateSettings({ extensionPermissionPrompt: v })} />
                                </SettingSection>
                            )}

                            {/* ════════════════ EXTENSIONS ════════════════ */}

                            {settingsTab === 'extensions' && (
                                <div className="h-full">
                                    <ExtensionsPanel />
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
