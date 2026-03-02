import { X, Moon, Zap, Puzzle, Info } from 'lucide-react';
import { useSettings } from '@/react-app/contexts/SettingsContext';
import { Switch } from '@/react-app/components/ui/switch';
import { Slider } from '@/react-app/components/ui/slider';
import { Input } from '@/react-app/components/ui/input';
import { Button } from '@/react-app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react-app/components/ui/select';
import { Sliders, Type, FileCode, Bot, Server } from 'lucide-react';
import ExtensionsPanel from '@/react-app/components/settings/ExtensionsPanel';

// Settings sidebar: General, Editor, AI, Extensions, About (VS Code / Cursor style)
const SETTING_TABS = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'editor', label: 'Editor', icon: FileCode },
    { id: 'ai', label: 'AI', icon: Bot },
    { id: 'extensions', label: 'Extensions', icon: Puzzle },
    { id: 'about', label: 'About', icon: Info },
];

export default function SettingsView() {
    const { settings, updateSettings, isSettingsOpen, setIsSettingsOpen, settingsTab, setSettingsTab } = useSettings();
    const activeTab = settingsTab;

    if (!isSettingsOpen) return null;

    const handleTestConnection = async () => {
        try {
            const res = await fetch(`${settings.ollamaEndpoint}/api/tags`);
            if (res.ok) {
                alert("Success! Connected to Ollama.");
            } else {
                alert("Failed to connect to Ollama. Check endpoint.");
            }
        } catch (e: any) {
            alert(`Error reaching Ollama endpoint. Is it running? (${e.message})`);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex bg-ide-bg/80 backdrop-blur-sm">
            <div className="w-full max-w-5xl mx-auto my-12 flex rounded-xl border border-ide-border bg-ide-sidebar shadow-2xl overflow-hidden">

                {/* Settings Sidebar */}
                <div className="w-64 flex-shrink-0 border-r border-ide-border bg-[rgba(15,17,26,0.5)] p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-8 pl-2">
                        <h2 className="text-sm font-semibold text-ide-text-primary tracking-wider uppercase text-gray-400">Preferences</h2>
                    </div>

                    <div className="flex flex-col gap-1">
                        {SETTING_TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSettingsTab(tab.id)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? 'bg-ide-active text-ide-text-primary'
                                        : 'text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Settings Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-ide-editor p-8 overflow-y-auto">
                    <div className="flex items-center justify-between mb-10 pb-6 border-b border-ide-border">
                        <div>
                            <h1 className="text-2xl font-bold text-ide-text-primary">
                                {SETTING_TABS.find(t => t.id === activeTab)?.label}
                            </h1>
                            <p className="text-ide-text-secondary mt-1 text-sm">
                                Configure your local coding environment and AI assistant behavior.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsSettingsOpen(false)}
                            className="p-2 rounded-lg text-ide-text-secondary hover:text-white hover:bg-ide-hover transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 max-w-3xl space-y-10">
                        {/* --- GENERAL SETTINGS --- */}
                        {activeTab === 'general' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <section className="space-y-4">
                                    <h3 className="text-sm font-semibold text-ide-text-secondary uppercase tracking-wider flex items-center gap-2">
                                        <Moon className="w-4 h-4" /> Appearance
                                    </h3>

                                    <div className="p-5 rounded-xl border border-ide-border bg-[rgba(15,17,26,0.3)] space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-ide-text-primary">Theme</div>
                                                <div className="text-xs text-ide-text-secondary mt-1">Select your preferred color theme</div>
                                            </div>
                                            <div className="w-48">
                                                <Select value={settings.theme} onValueChange={(v) => updateSettings({ theme: v })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select theme" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="deep-night">Deep Night</SelectItem>
                                                        <SelectItem value="snowy-studio">Snowy Studio (Light)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* --- EDITOR SETTINGS --- */}
                        {activeTab === 'editor' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <section className="space-y-4">
                                    <h3 className="text-sm font-semibold text-ide-text-secondary uppercase tracking-wider flex items-center gap-2">
                                        <Type className="w-4 h-4" /> Typography & Formatting
                                    </h3>

                                    <div className="p-5 rounded-xl border border-ide-border bg-[rgba(15,17,26,0.3)] space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-ide-text-primary">Font Family</label>
                                                <Select value={settings.fontFamily} onValueChange={(v) => updateSettings({ fontFamily: v })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select font" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="'JetBrains Mono', 'Fira Code', monospace">JetBrains Mono</SelectItem>
                                                        <SelectItem value="'Fira Code', monospace">Fira Code</SelectItem>
                                                        <SelectItem value="'Consolas', monospace">Consolas</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-ide-text-primary">Font Size ({settings.fontSize}px)</label>
                                                <Slider
                                                    value={[settings.fontSize]}
                                                    min={10} max={24} step={1}
                                                    onValueChange={([v]) => updateSettings({ fontSize: v })}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-ide-border flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-ide-text-primary">Format on Save</div>
                                                <div className="text-xs text-ide-text-secondary mt-1">Automatically clean up code using local Prettier rules</div>
                                            </div>
                                            <Switch
                                                checked={settings.formatOnSave}
                                                onCheckedChange={(v) => updateSettings({ formatOnSave: v })}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-sm font-semibold text-ide-text-secondary uppercase tracking-wider flex items-center gap-2">
                                        <FileCode className="w-4 h-4" /> Editor Behavior
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl border border-ide-border bg-[rgba(15,17,26,0.3)] flex items-start justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-ide-text-primary">Minimap</div>
                                                <div className="text-xs text-ide-text-secondary mt-1">Show code overview</div>
                                            </div>
                                            <Switch checked={settings.minimap} onCheckedChange={(v) => updateSettings({ minimap: v })} />
                                        </div>

                                        <div className="p-4 rounded-xl border border-ide-border bg-[rgba(15,17,26,0.3)] flex items-start justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-ide-text-primary">Line Numbers</div>
                                                <div className="text-xs text-ide-text-secondary mt-1">Display line markers</div>
                                            </div>
                                            <Switch checked={settings.lineNumbers} onCheckedChange={(v) => updateSettings({ lineNumbers: v })} />
                                        </div>

                                        <div className="p-4 rounded-xl border border-ide-border bg-[rgba(15,17,26,0.3)] flex items-start justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-ide-text-primary">Bracket Pairs</div>
                                                <div className="text-xs text-ide-text-secondary mt-1">Color matching brackets</div>
                                            </div>
                                            <Switch checked={settings.bracketPairColorization} onCheckedChange={(v) => updateSettings({ bracketPairColorization: v })} />
                                        </div>

                                        <div className="p-4 rounded-xl border border-ide-border bg-[rgba(15,17,26,0.3)] flex items-start justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-ide-text-primary">Word Wrap</div>
                                                <div className="text-xs text-ide-text-secondary mt-1">Wrap long lines of code</div>
                                            </div>
                                            <Switch checked={settings.wordWrap} onCheckedChange={(v) => updateSettings({ wordWrap: v })} />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* --- AI (Assistant + Ollama & Models) --- */}
                        {activeTab === 'ai' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <section className="space-y-4">
                                    <h3 className="text-sm font-semibold text-ide-text-secondary uppercase tracking-wider flex items-center gap-2">
                                        <Zap className="w-4 h-4" /> Inference Parameters
                                    </h3>

                                    <div className="p-5 rounded-xl border border-ide-border bg-[rgba(15,17,26,0.3)] space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium text-ide-text-primary">Temperature</label>
                                                <span className="text-xs font-mono bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">{settings.aiTemperature.toFixed(2)}</span>
                                            </div>
                                            <Slider
                                                value={[settings.aiTemperature]}
                                                min={0} max={1} step={0.05}
                                                onValueChange={([v]) => updateSettings({ aiTemperature: v })}
                                            />
                                            <div className="flex justify-between text-xs text-ide-text-secondary">
                                                <span>Precise</span>
                                                <span>Balanced</span>
                                                <span>Creative</span>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-ide-border space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-ide-text-primary">Enable Inline Suggestions</div>
                                                    <div className="text-xs text-ide-text-secondary mt-1">Show ghost-text code completions as you type.</div>
                                                </div>
                                                <Switch checked={settings.inlineSuggestions} onCheckedChange={(v) => updateSettings({ inlineSuggestions: v })} />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-ide-text-primary">Contextual Project Awareness</div>
                                                    <div className="text-xs text-ide-text-secondary mt-1">Index local files to provide better code context.</div>
                                                </div>
                                                <Switch checked={settings.contextualAwareness} onCheckedChange={(v) => updateSettings({ contextualAwareness: v })} />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-ide-text-primary">Streaming Response</div>
                                                    <div className="text-xs text-ide-text-secondary mt-1">Show model output in real-time as it's generated.</div>
                                                </div>
                                                <Switch checked={settings.streamingResponse} onCheckedChange={(v) => updateSettings({ streamingResponse: v })} />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-sm font-semibold text-ide-text-secondary uppercase tracking-wider flex items-center gap-2">
                                        <Server className="w-4 h-4" /> Ollama & Models
                                    </h3>

                                    <div className="p-5 rounded-xl border border-ide-border bg-[rgba(15,17,26,0.3)] space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-ide-text-secondary uppercase tracking-wider">Endpoint URL</label>
                                            <div className="flex gap-3">
                                                <Input
                                                    value={settings.ollamaEndpoint}
                                                    onChange={(e) => updateSettings({ ollamaEndpoint: e.target.value })}
                                                    className="font-mono bg-[rgba(15,17,26,0.5)] border-ide-border focus-visible:ring-indigo-500"
                                                />
                                                <Button onClick={handleTestConnection} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
                                                    Test Connection
                                                </Button>
                                            </div>
                                            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                Ollama configuration ready
                                            </p>
                                        </div>
                                        <div className="pt-4 border-t border-ide-border space-y-2">
                                            <label className="text-xs font-medium text-ide-text-secondary uppercase tracking-wider">Active Language Model</label>
                                            <Select value={settings.aiModel} onValueChange={(v) => updateSettings({ aiModel: v })}>
                                                <SelectTrigger className="w-full bg-[rgba(15,17,26,0.5)] border-ide-border">
                                                    <SelectValue placeholder="Select active model" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="qwen2.5-coder:7b">Qwen 2.5 Coder 7B</SelectItem>
                                                    <SelectItem value="qwen2.5-coder:14b">Qwen 2.5 Coder 14B</SelectItem>
                                                    <SelectItem value="llama3:8b">Llama 3 8B</SelectItem>
                                                    <SelectItem value="codellama:7b">Code Llama 7B</SelectItem>
                                                    <SelectItem value="deepseek-coder:6.7b">DeepSeek Coder 6.7B</SelectItem>
                                                    <SelectItem value="mistral:7b">Mistral 7B</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-ide-text-secondary mt-2">
                                                Qwen2.5-Coder is recommended for optimal performance on 8GB+ RAM.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* --- EXTENSIONS PANEL --- */}
                        {activeTab === 'extensions' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full">
                                <ExtensionsPanel />
                            </div>
                        )}

                        {/* --- ABOUT --- */}
                        {activeTab === 'about' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <section className="p-6 rounded-xl border border-ide-border bg-[rgba(15,17,26,0.3)]">
                                    <h3 className="text-sm font-semibold text-ide-text-secondary uppercase tracking-wider mb-4">StackFlow IDE</h3>
                                    <p className="text-ide-text-primary text-sm leading-relaxed mb-4">
                                        A modular AI-powered IDE with extension support, local Ollama integration, and a professional editor experience.
                                    </p>
                                    <div className="text-xs text-ide-text-secondary space-y-1">
                                        <p><strong className="text-ide-text-primary">Version:</strong> 1.0.0</p>
                                        <p><strong className="text-ide-text-primary">Architecture:</strong> React + TypeScript + Monaco · Spring Boot · Extensions & Command Registry</p>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
