import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─── Complete IDE Settings Interface ────────────────────────────────────────
export interface AppSettings {
    // ── Text Editor ──
    // General
    theme: string;
    tabSize: number;
    insertSpaces: boolean;
    autoSave: boolean;
    autoSaveDelay: number;
    lineNumbers: boolean;
    renderWhitespace: string;
    // Font
    fontFamily: string;
    fontSize: number;
    fontLigatures: boolean;
    lineHeight: number;
    // Formatting
    formatOnSave: boolean;
    formatOnPaste: boolean;
    defaultFormatter: string;
    // Cursor
    cursorStyle: string;
    cursorBlinking: string;
    cursorSmoothCaret: boolean;
    cursorWidth: number;
    // Minimap
    minimap: boolean;
    minimapScale: number;
    minimapMaxColumn: number;
    minimapRenderChars: boolean;
    // Suggestions
    suggestOnTriggerCharacters: boolean;
    quickSuggestions: boolean;
    inlineSuggestions: boolean;
    acceptSuggestionOnEnter: string;
    // Code Folding
    codeFolding: boolean;
    foldingStrategy: string;
    showFoldingControls: string;
    // Brackets
    autoCloseBrackets: string;
    bracketPairColorization: boolean;
    bracketPairGuides: boolean;
    // Indentation
    detectIndentation: boolean;
    autoIndent: string;
    // Word Wrap
    wordWrap: boolean;
    wordWrapColumn: number;
    // Multi Cursor
    multiCursorModifier: string;
    multiCursorPaste: string;
    // Sticky Scroll
    stickyScroll: boolean;
    stickyScrollMaxLines: number;
    // Diff Editor
    diffEditorSideBySide: boolean;
    diffEditorIgnoreWhitespace: boolean;

    // ── Workbench ──
    iconTheme: string;
    breadcrumbs: boolean;
    editorPreviewMode: boolean;
    editorTabCloseButton: string;
    editorOpenSideBySide: boolean;
    zenMode: boolean;
    screencastMode: boolean;
    layoutSidebarPosition: string;
    layoutActivityBarVisible: boolean;
    layoutStatusBarVisible: boolean;

    // ── Window ──
    zoomLevel: number;
    restoreWindows: string;
    newWindowDimensions: string;
    titleBarStyle: string;
    menuBarVisibility: string;

    // ── Features ──
    // Terminal
    terminalFontSize: number;
    terminalFontFamily: string;
    terminalCursorBlinking: boolean;
    terminalCursorStyle: string;
    terminalDefaultProfile: string;
    terminalScrollback: number;
    // Explorer
    explorerAutoReveal: boolean;
    explorerSortOrder: string;
    explorerCompactFolders: boolean;
    // Search
    searchExcludePattern: string;
    searchUseIgnoreFiles: boolean;
    searchSmartCase: boolean;
    // Debug
    debugOpenOnStart: string;
    debugInlineValues: boolean;
    debugToolBarLocation: string;
    // Source Control
    sourceControlAutoFetch: boolean;
    sourceControlAutoRefresh: boolean;
    sourceControlDiffDecorations: string;
    // Problems
    problemsAutoReveal: boolean;
    problemsShowCurrentOnly: boolean;
    // Tasks
    taskAutoDetect: string;
    // AI Assistant
    aiModel: string;
    aiTemperature: number;
    contextualAwareness: boolean;
    streamingResponse: boolean;
    aiContextWindow: number;
    aiSafetyMode: boolean;
    ollamaEndpoint: string;

    // ── Application ──
    autoUpdate: boolean;
    updateChannel: string;
    language: string;
    telemetry: boolean;
    performanceMode: boolean;
    maxMemory: number;
    storageAutoCleanup: boolean;

    // ── Security ──
    workspaceTrust: boolean;
    fileAccessRestricted: boolean;
    terminalSecurityConfirmPaste: boolean;
    aiSafetyBlocking: boolean;
    extensionPermissionPrompt: boolean;
}

// ─── Defaults ───────────────────────────────────────────────────────────────
const defaultSettings: AppSettings = {
    // Text Editor — General
    theme: 'deep-night',
    tabSize: 2,
    insertSpaces: true,
    autoSave: false,
    autoSaveDelay: 1000,
    lineNumbers: true,
    renderWhitespace: 'selection',
    // Font
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 14,
    fontLigatures: true,
    lineHeight: 1.6,
    // Formatting
    formatOnSave: true,
    formatOnPaste: false,
    defaultFormatter: 'prettier',
    // Cursor
    cursorStyle: 'line',
    cursorBlinking: 'blink',
    cursorSmoothCaret: true,
    cursorWidth: 2,
    // Minimap
    minimap: true,
    minimapScale: 1,
    minimapMaxColumn: 120,
    minimapRenderChars: true,
    // Suggestions
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    inlineSuggestions: true,
    acceptSuggestionOnEnter: 'on',
    // Code Folding
    codeFolding: true,
    foldingStrategy: 'auto',
    showFoldingControls: 'mouseover',
    // Brackets
    autoCloseBrackets: 'always',
    bracketPairColorization: true,
    bracketPairGuides: true,
    // Indentation
    detectIndentation: true,
    autoIndent: 'full',
    // Word Wrap
    wordWrap: true,
    wordWrapColumn: 80,
    // Multi Cursor
    multiCursorModifier: 'alt',
    multiCursorPaste: 'spread',
    // Sticky Scroll
    stickyScroll: true,
    stickyScrollMaxLines: 5,
    // Diff Editor
    diffEditorSideBySide: true,
    diffEditorIgnoreWhitespace: false,

    // Workbench
    iconTheme: 'material-icon-theme',
    breadcrumbs: true,
    editorPreviewMode: true,
    editorTabCloseButton: 'right',
    editorOpenSideBySide: false,
    zenMode: false,
    screencastMode: false,
    layoutSidebarPosition: 'left',
    layoutActivityBarVisible: true,
    layoutStatusBarVisible: true,

    // Window
    zoomLevel: 0,
    restoreWindows: 'all',
    newWindowDimensions: 'default',
    titleBarStyle: 'custom',
    menuBarVisibility: 'visible',

    // Features — Terminal
    terminalFontSize: 13,
    terminalFontFamily: "'Cascadia Code', 'Fira Code', monospace",
    terminalCursorBlinking: true,
    terminalCursorStyle: 'bar',
    terminalDefaultProfile: 'PowerShell',
    terminalScrollback: 10000,
    // Explorer
    explorerAutoReveal: true,
    explorerSortOrder: 'default',
    explorerCompactFolders: true,
    // Search
    searchExcludePattern: '**/node_modules, **/.git, **/dist',
    searchUseIgnoreFiles: true,
    searchSmartCase: true,
    // Debug
    debugOpenOnStart: 'openOnFirstSessionStart',
    debugInlineValues: true,
    debugToolBarLocation: 'floating',
    // Source Control
    sourceControlAutoFetch: false,
    sourceControlAutoRefresh: true,
    sourceControlDiffDecorations: 'all',
    // Problems
    problemsAutoReveal: true,
    problemsShowCurrentOnly: false,
    // Tasks
    taskAutoDetect: 'on',
    // AI Assistant
    aiModel: 'qwen2.5-coder:7b',
    aiTemperature: 0.7,
    contextualAwareness: true,
    streamingResponse: true,
    aiContextWindow: 32000,
    aiSafetyMode: true,
    ollamaEndpoint: 'http://localhost:11434',

    // Application
    autoUpdate: true,
    updateChannel: 'stable',
    language: 'en',
    telemetry: false,
    performanceMode: false,
    maxMemory: 4096,
    storageAutoCleanup: true,

    // Security
    workspaceTrust: true,
    fileAccessRestricted: false,
    terminalSecurityConfirmPaste: true,
    aiSafetyBlocking: true,
    extensionPermissionPrompt: true,
};

// ─── Context ────────────────────────────────────────────────────────────────
interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    resetSettings: () => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (isOpen: boolean, tab?: string) => void;
    settingsTab: string;
    setSettingsTab: (tab: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const saved = localStorage.getItem('ide-settings');
            if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Failed to parse settings:', e);
        }
        return defaultSettings;
    });

    const [isSettingsOpen, setIsSettingsOpenState] = useState(false);
    const [settingsTab, setSettingsTab] = useState('text-editor.general');

    const setIsSettingsOpen = (isOpen: boolean, tab?: string) => {
        setIsSettingsOpenState(isOpen);
        if (isOpen && tab) setSettingsTab(tab);
    };

    useEffect(() => {
        try { localStorage.setItem('ide-settings', JSON.stringify(settings)); }
        catch (e) { console.error('Failed to save settings:', e); }
    }, [settings]);

    useEffect(() => {
        // Remove existing theme classes
        document.documentElement.classList.remove(
            'dark',
            'theme-tokyo-night',
            'theme-github-dark',
            'theme-nord'
        );
        
        switch (settings.theme) {
            case 'deep-night':
            case 'dracula':
            case 'catppuccin-mocha':
            case 'one-dark-pro':
                document.documentElement.classList.add('dark');
                break;
            case 'tokyo-night':
                document.documentElement.classList.add('theme-tokyo-night');
                break;
            case 'github-dark':
                document.documentElement.classList.add('theme-github-dark');
                break;
            case 'nord':
                document.documentElement.classList.add('theme-nord');
                break;
            default:
                document.documentElement.classList.add('dark');
        }
    }, [settings.theme]);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => setSettings(defaultSettings);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, isSettingsOpen, setIsSettingsOpen, settingsTab, setSettingsTab }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within a SettingsProvider');
    return context;
}
