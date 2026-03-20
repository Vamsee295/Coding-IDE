import React, { useState, useEffect, useCallback } from 'react';
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
import { getTranslation } from '@/react-app/lib/i18n';
import { CONFIG } from '@/react-app/lib/config';

// ─── Sidebar Structure ──────────────────────────────────────────────────────

interface SubPage { id: string; label: string; icon: React.ReactNode; }
interface Category { id: string; label: string; icon: React.ReactNode; subPages: SubPage[]; }

const CATEGORIES: Category[] = [
    {
        id: 'text-editor', label: 'settings.category.textEditor', icon: <FileCode className="w-4 h-4" />,
        subPages: [
            { id: 'text-editor.general', label: 'settings.subpage.general', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'text-editor.font', label: 'settings.subpage.font', icon: <Type className="w-3.5 h-3.5" /> },
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
        id: 'workbench', label: 'settings.category.workbench', icon: <Palette className="w-4 h-4" />,
        subPages: [
            { id: 'workbench.appearance', label: 'settings.subpage.appearance', icon: <Eye className="w-3.5 h-3.5" /> },
            { id: 'workbench.breadcrumbs', label: 'Breadcrumbs', icon: <Navigation className="w-3.5 h-3.5" /> },
            { id: 'workbench.editor', label: 'Editor Management', icon: <Columns className="w-3.5 h-3.5" /> },
            { id: 'workbench.zen', label: 'Zen Mode', icon: <Sun className="w-3.5 h-3.5" /> },
            { id: 'workbench.screencast', label: 'Screencast Mode', icon: <MonitorSmartphone className="w-3.5 h-3.5" /> },
            { id: 'workbench.layout', label: 'Layout', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'window', label: 'settings.category.window', icon: <AppWindow className="w-4 h-4" />,
        subPages: [
            { id: 'window.startup', label: 'Startup', icon: <Maximize className="w-3.5 h-3.5" /> },
            { id: 'window.zoom', label: 'Zoom', icon: <ZoomIn className="w-3.5 h-3.5" /> },
            { id: 'window.title', label: 'Window Title', icon: <PanelTop className="w-3.5 h-3.5" /> },
            { id: 'window.menu', label: 'Menu Visibility', icon: <Menu className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'features', label: 'settings.category.features', icon: <Wrench className="w-4 h-4" />,
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
        id: 'application', label: 'settings.category.application', icon: <AppIcon className="w-4 h-4" />,
        subPages: [
            { id: 'application.updates', label: 'Updates', icon: <Download className="w-3.5 h-3.5" /> },
            { id: 'application.language', label: 'settings.subpage.language', icon: <Globe className="w-3.5 h-3.5" /> },
            { id: 'application.telemetry', label: 'Telemetry', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'application.performance', label: 'Performance', icon: <Cpu className="w-3.5 h-3.5" /> },
            { id: 'application.storage', label: 'Storage', icon: <HardDrive className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'security', label: 'settings.category.security', icon: <Shield className="w-4 h-4" />,
        subPages: [
            { id: 'security.trust', label: 'Workspace Trust', icon: <Lock className="w-3.5 h-3.5" /> },
            { id: 'security.fileaccess', label: 'File Access', icon: <FileKey className="w-3.5 h-3.5" /> },
            { id: 'security.terminal', label: 'Terminal Security', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
            { id: 'security.ai', label: 'AI Safety', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'security.extensions', label: 'Extension Permissions', icon: <KeyRound className="w-3.5 h-3.5" /> },
        ]
    },
    {
        id: 'extensions', label: 'settings.category.extensions', icon: <Puzzle className="w-4 h-4" />,
        subPages: []
    },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SettingsView() {
    const { settings, updateSettings, resetSettings, isSettingsOpen, setIsSettingsOpen, settingsTab, setSettingsTab } = useSettings();
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['text-editor', 'features']));
    const [searchQuery, setSearchQuery] = useState('');

    const t = useCallback((key: string) => getTranslation(settings.language, key), [settings.language]);

    const [availableModels, setAvailableModels] = useState<{ label: string, value: string }[]>([
        { label: 'Qwen 2.5 Coder 7B', value: 'qwen2.5-coder:7b' } // Immediate default, to be overwritten
    ]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelFetchError, setModelFetchError] = useState<string | null>(null);
    const [pullModelName, setPullModelName] = useState('');
    const [isPulling, setIsPulling] = useState(false);

    const formatModelName = (name: string) => {
        // e.g. "qwen2.5-coder:7b" -> "Qwen 2.5 Coder (7B)"
        let formatted = name.replace(/-/g, ' ');
        // capitalize first letter of each word
        formatted = formatted.replace(/\b\w/g, c => c.toUpperCase());
        // split by tag
        const parts = formatted.split(':');
        if (parts.length > 1) {
            return `${parts[0]} (${parts[1].toUpperCase()})`;
        }
        return formatted;
    };

    const fetchModels = useCallback(async () => {
        setIsLoadingModels(true);
        setModelFetchError(null);
        try {
            // Updated to use centralized CONFIG for the Java backend
            const res = await fetch(`${CONFIG.API_BASE_URL}/ai/models?endpoint=${encodeURIComponent(settings.ollamaEndpoint)}`);
            if (!res.ok) throw new Error("Failed to fetch models");

            const data = await res.json();
            if (data && data.models && Array.isArray(data.models)) {
                const fetchedOptions = data.models
                    .filter((m: any) => m && m.name) // Defensive filter
                    .map((m: any) => ({
                        label: m.name ? formatModelName(m.name) : 'Unknown Model',
                        value: m.name || ''
                    }));

                setAvailableModels(fetchedOptions.length > 0 ? fetchedOptions : [{ label: 'No models found', value: '' }]);
                // If current selected isn't in the list, we might want to update it,
                // but for now, just let the user see what's available.
            } else {
                throw new Error("Invalid response format");
            }
        } catch (e: any) {
            setModelFetchError(e.message || "Failed to connect to Ollama server");
            setAvailableModels([{ label: 'Error fetching models', value: 'error' }]);
        } finally {
            setIsLoadingModels(false);
        }
    }, [settings.ollamaEndpoint]);

    const handlePullModel = async () => {
        const targetModel = pullModelName.trim();
        if (!targetModel) return;

        setIsPulling(true);
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/ai/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: targetModel,
                    ollamaEndpoint: settings.ollamaEndpoint
                })
            });

            if (res.ok) {
                alert(`Successfully pulled ${targetModel}`);
                setPullModelName('');
                await fetchModels(); // Refresh the list
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Error pulling model: ${errData.error || res.statusText}`);
            }
        } catch (e: any) {
            alert(`Network error while pulling: ${e.message}`);
        } finally {
            setIsPulling(false);
        }
    };

    // Auto-fetch models when opening the AI tab
    useEffect(() => {
        if (isSettingsOpen && settingsTab === 'features.ai') {
            fetchModels();
        }
    }, [isSettingsOpen, settingsTab, fetchModels]);

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
                            <h2 className="text-xs font-semibold text-ide-text-secondary uppercase tracking-widest">{t('settings.title')}</h2>
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
                                placeholder={t('settings.search')}
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
                                        <span className="flex-1 text-left">{t( cat.label)}</span>
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
                                                        {t( sp.label)}
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
                            {t('settings.reset')}
                        </Button>
                    </div>
                </div>

                {/* ── CONTENT ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-ide-editor">
                    {/* Header */}
                    <div className="px-8 pt-6 pb-4 border-b border-ide-border flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs text-ide-text-secondary mb-1">
                            {activeCategory && <span>{t( activeCategory.label)}</span>}
                            {activeSubPage && <><ChevronRight className="w-3 h-3" /><span>{t( activeSubPage.label)}</span></>}
                        </div>
                        <h1 className="text-xl font-bold text-ide-text-primary">{t( pageTitle)}</h1>
                    </div>

                    {/* Settings Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        <div className="max-w-3xl space-y-2">

                            {/* ════════════════ TEXT EDITOR ════════════════ */}

                            {settingsTab === 'text-editor.general' && (
                                <SettingSection icon={<FileCode className="w-4 h-4" />} title={t( 'settings.tab.general')}>
                                    <SettingRow type="number" label={t( 'settings.label.tabSize')} description={t( 'settings.desc.tabSize')} value={settings.tabSize} min={1} max={8} onChange={v => updateSettings({ tabSize: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.insertSpaces')} description={t( 'settings.desc.insertSpaces')} value={settings.insertSpaces} onChange={v => updateSettings({ insertSpaces: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.autoSave')} description={t( 'settings.desc.autoSave')} value={settings.autoSave} onChange={v => updateSettings({ autoSave: v })} />
                                    <SettingRow type="number" label={t( 'settings.label.autoSaveDelay')} description={t( 'settings.desc.autoSaveDelay')} value={settings.autoSaveDelay} min={100} max={10000} step={100} onChange={v => updateSettings({ autoSaveDelay: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.lineNumbers')} description={t( 'settings.desc.lineNumbers')} value={settings.lineNumbers} onChange={v => updateSettings({ lineNumbers: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.renderWhitespace')} description={t( 'settings.desc.renderWhitespace')} value={settings.renderWhitespace} options={[
                                        { label: t( 'settings.option.none'), value: 'none' },
                                        { label: t( 'settings.option.boundary'), value: 'boundary' },
                                        { label: t( 'settings.option.selection'), value: 'selection' },
                                        { label: t( 'settings.option.trailing'), value: 'trailing' },
                                        { label: t( 'settings.option.all'), value: 'all' },
                                    ]} onChange={v => updateSettings({ renderWhitespace: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.font' && (
                                <SettingSection icon={<Type className="w-4 h-4" />} title={t( 'settings.tab.font')}>
                                    <SettingRow type="select" label={t( 'settings.label.fontFamily')} description={t( 'settings.desc.fontFamily')} value={settings.fontFamily} options={[
                                        { label: 'JetBrains Mono', value: "'JetBrains Mono', 'Fira Code', monospace" },
                                        { label: 'Fira Code', value: "'Fira Code', monospace" },
                                        { label: 'Cascadia Code', value: "'Cascadia Code', monospace" },
                                        { label: 'Consolas', value: "'Consolas', monospace" },
                                        { label: 'Source Code Pro', value: "'Source Code Pro', monospace" },
                                        { label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace" },
                                    ]} onChange={v => updateSettings({ fontFamily: v })} />
                                    <SettingRow type="slider" label={t( 'settings.label.fontSize')} description={t( 'settings.desc.fontSize')} value={settings.fontSize} min={10} max={28} unit="px" onChange={v => updateSettings({ fontSize: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.fontLigatures')} description={t( 'settings.desc.fontLigatures')} value={settings.fontLigatures} onChange={v => updateSettings({ fontLigatures: v })} />
                                    <SettingRow type="slider" label={t( 'settings.label.lineHeight')} description={t( 'settings.desc.lineHeight')} value={settings.lineHeight} min={1} max={3} step={0.1} onChange={v => updateSettings({ lineHeight: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.formatting' && (
                                <SettingSection icon={<FileCode className="w-4 h-4" />} title={t( 'settings.tab.formatting')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.formatOnSave')} description={t( 'settings.desc.formatOnSave')} value={settings.formatOnSave} onChange={v => updateSettings({ formatOnSave: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.formatOnPaste')} description={t( 'settings.desc.formatOnPaste')} value={settings.formatOnPaste} onChange={v => updateSettings({ formatOnPaste: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.defaultFormatter')} description={t( 'settings.desc.defaultFormatter')} value={settings.defaultFormatter} options={[
                                        { label: 'Prettier', value: 'prettier' },
                                        { label: 'ESLint', value: 'eslint' },
                                        { label: t( 'settings.option.none'), value: 'none' },
                                    ]} onChange={v => updateSettings({ defaultFormatter: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.cursor' && (
                                <SettingSection icon={<MousePointer2 className="w-4 h-4" />} title={t( 'settings.section.cursor')}>
                                    <SettingRow type="select" label={t( 'settings.label.cursorStyle')} description={t( 'settings.desc.cursorStyle')} value={settings.cursorStyle} options={[
                                        { label: t( 'settings.option.line'), value: 'line' },
                                        { label: t( 'settings.option.block'), value: 'block' },
                                        { label: t( 'settings.option.underline'), value: 'underline' },
                                        { label: t( 'settings.option.lineThin'), value: 'line-thin' },
                                        { label: t( 'settings.option.blockOutline'), value: 'block-outline' },
                                        { label: t( 'settings.option.underlineThin'), value: 'underline-thin' },
                                    ]} onChange={v => updateSettings({ cursorStyle: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.cursorBlinking')} description={t( 'settings.desc.cursorBlinking')} value={settings.cursorBlinking} options={[
                                        { label: t( 'settings.option.blink'), value: 'blink' },
                                        { label: t( 'settings.option.smooth'), value: 'smooth' },
                                        { label: t( 'settings.option.phase'), value: 'phase' },
                                        { label: t( 'settings.option.expand'), value: 'expand' },
                                        { label: t( 'settings.option.solid'), value: 'solid' },
                                    ]} onChange={v => updateSettings({ cursorBlinking: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.cursorSmoothCaret')} description={t( 'settings.desc.cursorSmoothCaret')} value={settings.cursorSmoothCaret} onChange={v => updateSettings({ cursorSmoothCaret: v })} />
                                    <SettingRow type="number" label={t( 'settings.label.cursorWidth')} description={t( 'settings.desc.cursorWidth')} value={settings.cursorWidth} min={1} max={5} onChange={v => updateSettings({ cursorWidth: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.minimap' && (
                                <SettingSection icon={<Map className="w-4 h-4" />} title={t( 'settings.section.minimap')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.minimapEnabled')} description={t( 'settings.desc.minimapEnabled')} value={settings.minimap} onChange={v => updateSettings({ minimap: v })} />
                                    <SettingRow type="slider" label={t( 'settings.label.minimapScale')} description={t( 'settings.desc.minimapScale')} value={settings.minimapScale} min={1} max={3} onChange={v => updateSettings({ minimapScale: v })} />
                                    <SettingRow type="number" label={t( 'settings.label.minimapMaxColumn')} description={t( 'settings.desc.minimapMaxColumn')} value={settings.minimapMaxColumn} min={40} max={300} step={10} onChange={v => updateSettings({ minimapMaxColumn: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.minimapRenderChars')} description={t( 'settings.desc.minimapRenderChars')} value={settings.minimapRenderChars} onChange={v => updateSettings({ minimapRenderChars: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.suggestions' && (
                                <SettingSection icon={<Lightbulb className="w-4 h-4" />} title={t( 'settings.section.suggestions')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.suggestOnTriggerCharacters')} description={t( 'settings.desc.suggestOnTriggerCharacters')} value={settings.suggestOnTriggerCharacters} onChange={v => updateSettings({ suggestOnTriggerCharacters: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.quickSuggestions')} description={t( 'settings.desc.quickSuggestions')} value={settings.quickSuggestions} onChange={v => updateSettings({ quickSuggestions: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.inlineSuggestions')} description={t( 'settings.desc.inlineSuggestions')} value={settings.inlineSuggestions} onChange={v => updateSettings({ inlineSuggestions: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.acceptSuggestionOnEnter')} description={t( 'settings.desc.acceptSuggestionOnEnter')} value={settings.acceptSuggestionOnEnter} options={[
                                        { label: t( 'settings.option.on'), value: 'on' },
                                        { label: t( 'settings.option.smart'), value: 'smart' },
                                        { label: t( 'settings.option.off'), value: 'off' },
                                    ]} onChange={v => updateSettings({ acceptSuggestionOnEnter: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.folding' && (
                                <SettingSection icon={<FoldVertical className="w-4 h-4" />} title={t( 'settings.section.folding')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.codeFolding')} description={t( 'settings.desc.codeFolding')} value={settings.codeFolding} onChange={v => updateSettings({ codeFolding: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.foldingStrategy')} description={t( 'settings.desc.foldingStrategy')} value={settings.foldingStrategy} options={[
                                        { label: t( 'settings.option.auto'), value: 'auto' },
                                        { label: t( 'settings.option.indentation'), value: 'indentation' },
                                    ]} onChange={v => updateSettings({ foldingStrategy: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.showFoldingControls')} description={t( 'settings.desc.showFoldingControls')} value={settings.showFoldingControls} options={[
                                        { label: t( 'settings.option.always'), value: 'always' },
                                        { label: t( 'settings.option.mouseover'), value: 'mouseover' },
                                        { label: t( 'settings.option.never'), value: 'never' },
                                    ]} onChange={v => updateSettings({ showFoldingControls: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.brackets' && (
                                <SettingSection icon={<Braces className="w-4 h-4" />} title={t( 'settings.section.brackets')}>
                                    <SettingRow type="select" label={t( 'settings.label.autoCloseBrackets')} description={t( 'settings.desc.autoCloseBrackets')} value={settings.autoCloseBrackets} options={[
                                        { label: t( 'settings.option.always'), value: 'always' },
                                        { label: t( 'settings.option.languageDefined'), value: 'languageDefined' },
                                        { label: t( 'settings.option.beforeWhitespace'), value: 'beforeWhitespace' },
                                        { label: t( 'settings.option.never'), value: 'never' },
                                    ]} onChange={v => updateSettings({ autoCloseBrackets: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.bracketPairColorization')} description={t( 'settings.desc.bracketPairColorization')} value={settings.bracketPairColorization} onChange={v => updateSettings({ bracketPairColorization: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.bracketPairGuides')} description={t( 'settings.desc.bracketPairGuides')} value={settings.bracketPairGuides} onChange={v => updateSettings({ bracketPairGuides: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.indentation' && (
                                <SettingSection icon={<IndentIncrease className="w-4 h-4" />} title={t( 'settings.section.indentation')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.detectIndentation')} description={t( 'settings.desc.detectIndentation')} value={settings.detectIndentation} onChange={v => updateSettings({ detectIndentation: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.autoIndent')} description={t( 'settings.desc.autoIndent')} value={settings.autoIndent} options={[
                                        { label: t( 'settings.option.none'), value: 'none' },
                                        { label: t( 'settings.option.keep'), value: 'keep' },
                                        { label: t( 'settings.option.brackets'), value: 'brackets' },
                                        { label: t( 'settings.option.advanced'), value: 'advanced' },
                                        { label: t( 'settings.option.full'), value: 'full' },
                                    ]} onChange={v => updateSettings({ autoIndent: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.wordwrap' && (
                                <SettingSection icon={<WrapText className="w-4 h-4" />} title={t( 'settings.section.wordwrap')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.wordWrap')} description={t( 'settings.desc.wordWrap')} value={settings.wordWrap} onChange={v => updateSettings({ wordWrap: v })} />
                                    <SettingRow type="number" label={t( 'settings.label.wordWrapColumn')} description={t( 'settings.desc.wordWrapColumn')} value={settings.wordWrapColumn} min={40} max={200} step={10} onChange={v => updateSettings({ wordWrapColumn: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.multicursor' && (
                                <SettingSection icon={<Pointer className="w-4 h-4" />} title={t( 'settings.section.multicursor')}>
                                    <SettingRow type="select" label={t( 'settings.label.multiCursorModifier')} description={t( 'settings.desc.multiCursorModifier')} value={settings.multiCursorModifier} options={[
                                        { label: t( 'settings.option.alt'), value: 'alt' },
                                        { label: t( 'settings.option.ctrlCmd'), value: 'ctrlCmd' },
                                    ]} onChange={v => updateSettings({ multiCursorModifier: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.multiCursorPaste')} description={t( 'settings.desc.multiCursorPaste')} value={settings.multiCursorPaste} options={[
                                        { label: t( 'settings.option.spread'), value: 'spread' },
                                        { label: t( 'settings.option.full'), value: 'full' },
                                    ]} onChange={v => updateSettings({ multiCursorPaste: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.stickyscroll' && (
                                <SettingSection icon={<StickyNote className="w-4 h-4" />} title={t( 'settings.section.stickyscroll')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.stickyScroll')} description={t( 'settings.desc.stickyScroll')} value={settings.stickyScroll} onChange={v => updateSettings({ stickyScroll: v })} />
                                    <SettingRow type="number" label={t( 'settings.label.stickyScrollMaxLines')} description={t( 'settings.desc.stickyScrollMaxLines')} value={settings.stickyScrollMaxLines} min={1} max={10} onChange={v => updateSettings({ stickyScrollMaxLines: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'text-editor.diff' && (
                                <SettingSection icon={<GitCompare className="w-4 h-4" />} title={t( 'settings.section.diff')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.diffEditorSideBySide')} description={t( 'settings.desc.diffEditorSideBySide')} value={settings.diffEditorSideBySide} onChange={v => updateSettings({ diffEditorSideBySide: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.diffEditorIgnoreWhitespace')} description={t( 'settings.desc.diffEditorIgnoreWhitespace')} value={settings.diffEditorIgnoreWhitespace} onChange={v => updateSettings({ diffEditorIgnoreWhitespace: v })} />
                                </SettingSection>
                            )}

                            {/* ════════════════ WORKBENCH ════════════════ */}

                            {settingsTab === 'workbench.appearance' && (
                                <SettingSection icon={<Eye className="w-4 h-4" />} title={t( 'settings.section.appearance')}>
                                    <SettingRow type="select" label={t( 'settings.label.theme')} description={t( 'settings.desc.theme')} value={settings.theme} options={[
                                        { label: 'Deep Night', value: 'deep-night' },
                                        { label: 'Tokyo Night (Premium)', value: 'tokyo-night' },
                                        { label: 'GitHub Dark (Premium)', value: 'github-dark' },
                                        { label: 'Nord (Premium)', value: 'nord' },
                                        { label: 'Snowy Studio (Light)', value: 'snowy-studio' },
                                        { label: 'Catppuccin Mocha', value: 'catppuccin-mocha' },
                                        { label: 'Dracula', value: 'dracula' },
                                        { label: 'One Dark Pro', value: 'one-dark-pro' },
                                    ]} onChange={v => updateSettings({ theme: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.iconTheme')} description={t( 'settings.desc.iconTheme')} value={settings.iconTheme} options={[
                                        { label: 'Material Icon Theme', value: 'material-icon-theme' },
                                        { label: 'VS Code Icons', value: 'vscode-icons' },
                                        { label: t( 'settings.option.none'), value: 'none' },
                                    ]} onChange={v => updateSettings({ iconTheme: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.breadcrumbs' && (
                                <SettingSection icon={<Navigation className="w-4 h-4" />} title={t( 'settings.section.breadcrumbs')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.breadcrumbs')} description={t( 'settings.desc.breadcrumbs')} value={settings.breadcrumbs} onChange={v => updateSettings({ breadcrumbs: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.editor' && (
                                <SettingSection icon={<Columns className="w-4 h-4" />} title={t( 'settings.section.editor')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.editorPreviewMode')} description={t( 'settings.desc.editorPreviewMode')} value={settings.editorPreviewMode} onChange={v => updateSettings({ editorPreviewMode: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.editorTabCloseButton')} description={t( 'settings.desc.editorTabCloseButton')} value={settings.editorTabCloseButton} options={[
                                        { label: t( 'settings.option.right'), value: 'right' },
                                        { label: t( 'settings.option.left'), value: 'left' },
                                        { label: t( 'settings.option.off'), value: 'off' },
                                    ]} onChange={v => updateSettings({ editorTabCloseButton: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.editorOpenSideBySide')} description={t( 'settings.desc.editorOpenSideBySide')} value={settings.editorOpenSideBySide} onChange={v => updateSettings({ editorOpenSideBySide: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.zen' && (
                                <SettingSection icon={<Sun className="w-4 h-4" />} title={t( 'settings.section.zen')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.zenMode')} description={t( 'settings.desc.zenMode')} value={settings.zenMode} onChange={v => updateSettings({ zenMode: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.screencast' && (
                                <SettingSection icon={<MonitorSmartphone className="w-4 h-4" />} title={t( 'settings.section.screencast')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.screencastMode')} description={t( 'settings.desc.screencastMode')} value={settings.screencastMode} onChange={v => updateSettings({ screencastMode: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'workbench.layout' && (
                                <SettingSection icon={<LayoutDashboard className="w-4 h-4" />} title={t( 'settings.section.layout')}>
                                    <SettingRow type="select" label={t( 'settings.label.sidebarPosition')} description={t( 'settings.desc.sidebarPosition')} value={settings.layoutSidebarPosition} options={[
                                        { label: t( 'settings.option.left'), value: 'left' },
                                        { label: t( 'settings.option.right'), value: 'right' },
                                    ]} onChange={v => updateSettings({ layoutSidebarPosition: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.activityBarVisible')} description={t( 'settings.desc.activityBarVisible')} value={settings.layoutActivityBarVisible} onChange={v => updateSettings({ layoutActivityBarVisible: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.statusBarVisible')} description={t( 'settings.desc.statusBarVisible')} value={settings.layoutStatusBarVisible} onChange={v => updateSettings({ layoutStatusBarVisible: v })} />
                                </SettingSection>
                            )}

                            {/* ════════════════ WINDOW ════════════════ */}

                            {settingsTab === 'window.startup' && (
                                <SettingSection icon={<Maximize className="w-4 h-4" />} title={t( 'settings.section.startup')}>
                                    <SettingRow type="select" label={t( 'settings.label.restoreWindows')} description={t( 'settings.desc.restoreWindows')} value={settings.restoreWindows} options={[
                                        { label: t( 'settings.option.all'), value: 'all' },
                                        { label: t( 'settings.option.folders'), value: 'folders' },
                                        { label: t( 'settings.option.one'), value: 'one' },
                                        { label: t( 'settings.option.none'), value: 'none' },
                                    ]} onChange={v => updateSettings({ restoreWindows: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.newWindowDimensions')} description={t( 'settings.desc.newWindowDimensions')} value={settings.newWindowDimensions} options={[
                                        { label: t( 'settings.option.default'), value: 'default' },
                                        { label: t( 'settings.option.inherit'), value: 'inherit' },
                                        { label: t( 'settings.option.offset'), value: 'offset' },
                                        { label: t( 'settings.option.maximized'), value: 'maximized' },
                                        { label: t( 'settings.option.fullscreen'), value: 'fullscreen' },
                                    ]} onChange={v => updateSettings({ newWindowDimensions: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'window.zoom' && (
                                <SettingSection icon={<ZoomIn className="w-4 h-4" />} title={t( 'settings.section.zoom')}>
                                    <SettingRow type="slider" label={t( 'settings.label.zoomLevel')} description={t( 'settings.desc.zoomLevel')} value={settings.zoomLevel} min={-3} max={5} step={0.5} onChange={v => updateSettings({ zoomLevel: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'window.title' && (
                                <SettingSection icon={<PanelTop className="w-4 h-4" />} title={t( 'settings.section.title')}>
                                    <SettingRow type="select" label={t( 'settings.label.titleBarStyle')} description={t( 'settings.desc.titleBarStyle')} value={settings.titleBarStyle} options={[
                                        { label: t( 'settings.option.custom'), value: 'custom' },
                                        { label: t( 'settings.option.native'), value: 'native' },
                                    ]} onChange={v => updateSettings({ titleBarStyle: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'window.menu' && (
                                <SettingSection icon={<Menu className="w-4 h-4" />} title={t( 'settings.section.menu')}>
                                    <SettingRow type="select" label={t( 'settings.label.menuBarVisibility')} description={t( 'settings.desc.menuBarVisibility')} value={settings.menuBarVisibility} options={[
                                        { label: t( 'settings.option.visible'), value: 'visible' },
                                        { label: t( 'settings.option.toggle'), value: 'toggle' },
                                        { label: t( 'settings.option.hidden'), value: 'hidden' },
                                        { label: t( 'settings.option.compact'), value: 'compact' },
                                    ]} onChange={v => updateSettings({ menuBarVisibility: v })} />
                                </SettingSection>
                            )}

                            {/* ════════════════ FEATURES ════════════════ */}

                            {settingsTab === 'features.terminal' && (
                                <SettingSection icon={<Terminal className="w-4 h-4" />} title={t( 'settings.section.terminal')}>
                                    <SettingRow type="slider" label={t( 'settings.label.terminalFontSize')} description={t( 'settings.desc.terminalFontSize')} value={settings.terminalFontSize} min={8} max={24} unit="px" onChange={v => updateSettings({ terminalFontSize: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.terminalFontFamily')} description={t( 'settings.desc.terminalFontFamily')} value={settings.terminalFontFamily} options={[
                                        { label: 'Cascadia Code', value: "'Cascadia Code', 'Fira Code', monospace" },
                                        { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
                                        { label: 'Fira Code', value: "'Fira Code', monospace" },
                                        { label: 'Consolas', value: "'Consolas', monospace" },
                                    ]} onChange={v => updateSettings({ terminalFontFamily: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.terminalCursorBlinking')} description={t( 'settings.desc.terminalCursorBlinking')} value={settings.terminalCursorBlinking} onChange={v => updateSettings({ terminalCursorBlinking: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.terminalCursorStyle')} description={t( 'settings.desc.terminalCursorStyle')} value={settings.terminalCursorStyle} options={[
                                        { label: t( 'settings.option.bar'), value: 'bar' },
                                        { label: t( 'settings.option.block'), value: 'block' },
                                        { label: t( 'settings.option.underline'), value: 'underline' },
                                    ]} onChange={v => updateSettings({ terminalCursorStyle: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.terminalDefaultProfile')} description={t( 'settings.desc.terminalDefaultProfile')} value={settings.terminalDefaultProfile} options={[
                                        { label: 'PowerShell', value: 'PowerShell' },
                                        { label: 'Git Bash', value: 'Git Bash' },
                                        { label: 'Command Prompt', value: 'Command Prompt' },
                                        { label: 'WSL', value: 'Ubuntu (WSL)' },
                                    ]} onChange={v => updateSettings({ terminalDefaultProfile: v })} />
                                    <SettingRow type="number" label={t( 'settings.label.terminalScrollback')} description={t( 'settings.desc.terminalScrollback')} value={settings.terminalScrollback} min={1000} max={100000} step={1000} onChange={v => updateSettings({ terminalScrollback: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.explorer' && (
                                <SettingSection icon={<FolderOpen className="w-4 h-4" />} title={t( 'settings.section.explorer')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.explorerAutoReveal')} description={t( 'settings.desc.explorerAutoReveal')} value={settings.explorerAutoReveal} onChange={v => updateSettings({ explorerAutoReveal: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.explorerSortOrder')} description={t( 'settings.desc.explorerSortOrder')} value={settings.explorerSortOrder} options={[
                                        { label: t( 'settings.option.default'), value: 'default' },
                                        { label: t( 'settings.option.mixed'), value: 'mixed' },
                                        { label: t( 'settings.option.filesFirst'), value: 'filesFirst' },
                                        { label: t( 'settings.option.type'), value: 'type' },
                                        { label: t( 'settings.option.modified'), value: 'modified' },
                                    ]} onChange={v => updateSettings({ explorerSortOrder: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.explorerCompactFolders')} description={t( 'settings.desc.explorerCompactFolders')} value={settings.explorerCompactFolders} onChange={v => updateSettings({ explorerCompactFolders: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.search' && (
                                <SettingSection icon={<SearchIcon className="w-4 h-4" />} title={t( 'settings.section.search')}>
                                    <SettingRow type="input" label={t( 'settings.label.searchExcludePattern')} description={t( 'settings.desc.searchExcludePattern')} value={settings.searchExcludePattern} onChange={v => updateSettings({ searchExcludePattern: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.searchUseIgnoreFiles')} description={t( 'settings.desc.searchUseIgnoreFiles')} value={settings.searchUseIgnoreFiles} onChange={v => updateSettings({ searchUseIgnoreFiles: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.searchSmartCase')} description={t( 'settings.desc.searchSmartCase')} value={settings.searchSmartCase} onChange={v => updateSettings({ searchSmartCase: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.debug' && (
                                <SettingSection icon={<Bug className="w-4 h-4" />} title={t( 'settings.section.debug')}>
                                    <SettingRow type="select" label={t( 'settings.label.debugOpenOnStart')} description={t( 'settings.desc.debugOpenOnStart')} value={settings.debugOpenOnStart} options={[
                                        { label: t( 'settings.option.onFirstSession'), value: 'openOnFirstSessionStart' },
                                        { label: t( 'settings.option.onEverySession'), value: 'openOnSessionStart' },
                                        { label: t( 'settings.option.never'), value: 'neverOpen' },
                                    ]} onChange={v => updateSettings({ debugOpenOnStart: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.debugInlineValues')} description={t( 'settings.desc.debugInlineValues')} value={settings.debugInlineValues} onChange={v => updateSettings({ debugInlineValues: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.debugToolBarLocation')} description={t( 'settings.desc.debugToolBarLocation')} value={settings.debugToolBarLocation} options={[
                                        { label: t( 'settings.option.floating'), value: 'floating' },
                                        { label: t( 'settings.option.docked'), value: 'docked' },
                                        { label: t( 'settings.option.hidden'), value: 'hidden' },
                                    ]} onChange={v => updateSettings({ debugToolBarLocation: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.sourcecontrol' && (
                                <SettingSection icon={<GitBranch className="w-4 h-4" />} title={t( 'settings.section.sourcecontrol')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.scmAutoFetch')} description={t( 'settings.desc.scmAutoFetch')} value={settings.sourceControlAutoFetch} onChange={v => updateSettings({ sourceControlAutoFetch: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.scmAutoRefresh')} description={t( 'settings.desc.scmAutoRefresh')} value={settings.sourceControlAutoRefresh} onChange={v => updateSettings({ sourceControlAutoRefresh: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.scmDiffDecorations')} description={t( 'settings.desc.scmDiffDecorations')} value={settings.sourceControlDiffDecorations} options={[
                                        { label: t( 'settings.option.all'), value: 'all' },
                                        { label: t( 'settings.option.gutter'), value: 'gutter' },
                                        { label: t( 'settings.option.overview'), value: 'overview' },
                                        { label: t( 'settings.option.minimap'), value: 'minimap' },
                                        { label: t( 'settings.option.none'), value: 'none' },
                                    ]} onChange={v => updateSettings({ sourceControlDiffDecorations: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.problems' && (
                                <SettingSection icon={<AlertCircle className="w-4 h-4" />} title={t( 'settings.section.problems')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.problemsAutoReveal')} description={t( 'settings.desc.problemsAutoReveal')} value={settings.problemsAutoReveal} onChange={v => updateSettings({ problemsAutoReveal: v })} />
                                    <SettingRow type="toggle" label={t( 'settings.label.problemsShowCurrentOnly')} description={t( 'settings.desc.problemsShowCurrentOnly')} value={settings.problemsShowCurrentOnly} onChange={v => updateSettings({ problemsShowCurrentOnly: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.tasks' && (
                                <SettingSection icon={<ListChecks className="w-4 h-4" />} title={t( 'settings.section.tasks')}>
                                    <SettingRow type="select" label={t( 'settings.label.taskAutoDetect')} description={t( 'settings.desc.taskAutoDetect')} value={settings.taskAutoDetect} options={[
                                        { label: t( 'settings.option.on'), value: 'on' },
                                        { label: t( 'settings.option.off'), value: 'off' },
                                    ]} onChange={v => updateSettings({ taskAutoDetect: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'features.ai' && (
                                <>
                                    <SettingSection icon={<Bot className="w-4 h-4" />} title={t( 'settings.section.ai')}>
                                        <SettingRow
                                            type="select"
                                            label={t( 'settings.label.aiModel')}
                                            description={modelFetchError ? t( 'settings.desc.aiModelError') : (isLoadingModels ? t( 'settings.desc.aiModelScanning') : t( 'settings.desc.aiModel'))}
                                            value={settings.aiModel || (availableModels[0]?.value || 'none')}
                                            options={availableModels.length > 0 ? availableModels : [{ label: t( 'settings.option.scanning'), value: 'none' }]}
                                            onChange={v => updateSettings({ aiModel: v })}
                                        />
                                        <SettingRow type="slider" label={t( 'settings.label.aiTemperature')} description={t( 'settings.desc.aiTemperature')} value={settings.aiTemperature} min={0} max={1} step={0.05} onChange={v => updateSettings({ aiTemperature: v })} />
                                        <SettingRow type="number" label={t( 'settings.label.aiContextWindow')} description={t( 'settings.desc.aiContextWindow')} value={settings.aiContextWindow} min={2048} max={128000} step={1024} onChange={v => updateSettings({ aiContextWindow: v })} />
                                        <SettingRow type="toggle" label={t( 'settings.label.contextualAwareness')} description={t( 'settings.desc.contextualAwareness')} value={settings.contextualAwareness} onChange={v => updateSettings({ contextualAwareness: v })} />
                                        <SettingRow type="toggle" label={t( 'settings.label.streamingResponse')} description={t( 'settings.desc.streamingResponse')} value={settings.streamingResponse} onChange={v => updateSettings({ streamingResponse: v })} />
                                        <SettingRow type="toggle" label={t( 'settings.label.aiSafetyMode')} description={t( 'settings.desc.aiSafetyMode')} value={settings.aiSafetyMode} onChange={v => updateSettings({ aiSafetyMode: v })} />
                                    </SettingSection>
                                    <SettingSection icon={<Server className="w-4 h-4" />} title={t( 'settings.section.ollama')}>
                                        <SettingRow type="input" label={t( 'settings.label.ollamaEndpoint')} description={t( 'settings.desc.ollamaEndpoint')} value={settings.ollamaEndpoint} onChange={v => updateSettings({ ollamaEndpoint: v })} />
                                        <div className="py-2 px-4 flex flex-wrap gap-2 items-center">
                                            <Button onClick={handleTestConnection} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-4" disabled={isLoadingModels}>
                                                <Zap className="w-3.5 h-3.5 mr-1.5" /> {t( 'settings.button.testConnection')}
                                            </Button>
                                            <Button onClick={fetchModels} variant="secondary" className="text-xs h-8 px-4" disabled={isLoadingModels}>
                                                {isLoadingModels ? t( 'settings.option.scanning') : t( 'settings.button.refreshModels')}
                                            </Button>
                                        </div>
                                    </SettingSection>
                                    <SettingSection icon={<Download className="w-4 h-4" />} title={t( 'settings.section.modelManagement')}>
                                        <div className="py-2 px-4 flex gap-2 items-center">
                                            <Input
                                                value={pullModelName}
                                                onChange={e => setPullModelName(e.target.value)}
                                                placeholder="e.g. deepseek-coder:6.7b"
                                                className="h-8 w-64 text-xs bg-[rgba(15,17,26,0.5)] border-ide-border focus-visible:ring-indigo-500"
                                            />
                                            <Button
                                                onClick={handlePullModel}
                                                disabled={!pullModelName.trim() || isPulling}
                                                className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-4"
                                            >
                                                {isPulling ? t( 'settings.button.pulling') : t( 'settings.button.installModel')}
                                            </Button>
                                        </div>
                                        <div className="px-4 pb-2 text-[10px] text-ide-text-secondary">
                                            {t( 'settings.desc.pullModelWarning')}
                                        </div>
                                    </SettingSection>
                                </>
                            )}

                            {/* ════════════════ APPLICATION ════════════════ */}

                            {settingsTab === 'application.updates' && (
                                <SettingSection icon={<Download className="w-4 h-4" />} title={t( 'settings.section.updates')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.autoUpdate')} description={t( 'settings.desc.autoUpdate')} value={settings.autoUpdate} onChange={v => updateSettings({ autoUpdate: v })} />
                                    <SettingRow type="select" label={t( 'settings.label.updateChannel')} description={t( 'settings.desc.updateChannel')} value={settings.updateChannel} options={[
                                        { label: t( 'settings.option.stable'), value: 'stable' },
                                        { label: t( 'settings.option.insider'), value: 'insider' },
                                    ]} onChange={v => updateSettings({ updateChannel: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'application.language' && (
                                <SettingSection icon={<Globe className="w-4 h-4" />} title={t( 'settings.subpage.language')}>
                                    <SettingRow
                                        type="select"
                                        label={t( 'settings.label.displayLanguage')}
                                        description={t( 'settings.desc.displayLanguage')}
                                        value={settings.language} options={[
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
                                <SettingSection icon={<BarChart3 className="w-4 h-4" />} title={t( 'settings.section.telemetry')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.telemetry')} description={t( 'settings.desc.telemetry')} value={settings.telemetry} onChange={v => updateSettings({ telemetry: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'application.performance' && (
                                <SettingSection icon={<Cpu className="w-4 h-4" />} title={t( 'settings.section.performance')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.performanceMode')} description={t( 'settings.desc.performanceMode')} value={settings.performanceMode} onChange={v => updateSettings({ performanceMode: v })} />
                                    <SettingRow type="number" label={t( 'settings.label.maxMemory')} description={t( 'settings.desc.maxMemory')} value={settings.maxMemory} min={1024} max={32768} step={512} onChange={v => updateSettings({ maxMemory: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'application.storage' && (
                                <SettingSection icon={<HardDrive className="w-4 h-4" />} title={t( 'settings.section.storage')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.storageAutoCleanup')} description={t( 'settings.desc.storageAutoCleanup')} value={settings.storageAutoCleanup} onChange={v => updateSettings({ storageAutoCleanup: v })} />
                                </SettingSection>
                            )}

                            {/* ════════════════ SECURITY ════════════════ */}

                            {settingsTab === 'security.trust' && (
                                <SettingSection icon={<Lock className="w-4 h-4" />} title={t( 'settings.section.trust')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.workspaceTrust')} description={t( 'settings.desc.workspaceTrust')} value={settings.workspaceTrust} onChange={v => updateSettings({ workspaceTrust: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'security.fileaccess' && (
                                <SettingSection icon={<FileKey className="w-4 h-4" />} title={t( 'settings.section.fileaccess')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.fileAccessRestricted')} description={t( 'settings.desc.fileAccessRestricted')} value={settings.fileAccessRestricted} onChange={v => updateSettings({ fileAccessRestricted: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'security.terminal' && (
                                <SettingSection icon={<ShieldAlert className="w-4 h-4" />} title={t( 'settings.section.securityterminal')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.terminalSecurityConfirmPaste')} description={t( 'settings.desc.terminalSecurityConfirmPaste')} value={settings.terminalSecurityConfirmPaste} onChange={v => updateSettings({ terminalSecurityConfirmPaste: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'security.ai' && (
                                <SettingSection icon={<ShieldCheck className="w-4 h-4" />} title={t( 'settings.section.aisafety')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.aiSafetyBlocking')} description={t( 'settings.desc.aiSafetyBlocking')} value={settings.aiSafetyBlocking} onChange={v => updateSettings({ aiSafetyBlocking: v })} />
                                </SettingSection>
                            )}

                            {settingsTab === 'security.extensions' && (
                                <SettingSection icon={<KeyRound className="w-4 h-4" />} title={t( 'settings.section.extpermissions')}>
                                    <SettingRow type="toggle" label={t( 'settings.label.extensionPermissionPrompt')} description={t( 'settings.desc.extensionPermissionPrompt')} value={settings.extensionPermissionPrompt} onChange={v => updateSettings({ extensionPermissionPrompt: v })} />
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
