import {
  Search,
  Settings,
  Download,
  Maximize2,
  X,
  Minimize2,
  User,
  Bell,
  Cpu,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";

interface NavbarProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const menuItems = [
  { name: "File", items: ["New File", "Open File", "Save", "Save As", "Close"] },
  { name: "Edit", items: ["Undo", "Redo", "Cut", "Copy", "Paste", "Find"] },
  { name: "Selection", items: ["Select All", "Expand Selection", "Shrink Selection"] },
  { name: "View", items: ["Command Palette", "Explorer", "Search", "Terminal"] },
  { name: "Go", items: ["Go to File", "Go to Line", "Go to Symbol"] },
  { name: "Run", items: ["Run Without Debugging", "Start Debugging"] },
  { name: "Terminal", items: ["New Terminal", "Split Terminal", "Clear Terminal"] },
  { name: "Help", items: ["Documentation", "Keyboard Shortcuts", "About"] },
];

const models = [
  { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder 7B" },
  { id: "qwen2.5-coder:14b", name: "Qwen 2.5 Coder 14B" },
  { id: "codellama:7b", name: "Code Llama 7B" },
  { id: "deepseek-coder:6.7b", name: "DeepSeek Coder" },
];

export default function Navbar({ selectedModel, onModelChange }: NavbarProps) {
  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  return (
    <header className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center shrink-0">
      {/* Left - Menu Items */}
      <div className="flex items-center h-full">
        {menuItems.map((menu) => (
          <DropdownMenu key={menu.name}>
            <DropdownMenuTrigger asChild>
              <button
                className="px-3 h-full text-xs text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover transition-colors focus:outline-none"
              >
                {menu.name}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-[200px] bg-ide-sidebar border-ide-border"
              align="start"
            >
              {menu.items.map((item) => (
                <DropdownMenuItem
                  key={item}
                  className="text-xs text-ide-text-primary hover:bg-ide-hover focus:bg-ide-hover cursor-pointer"
                >
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>

      {/* Center - Title */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-ide-text-secondary">
          Ollama IDE - Local AI Code Editor
        </span>
      </div>

      {/* Right - Actions & Model Selector */}
      <div className="flex items-center gap-1 px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-xs text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
            >
              <Cpu className="w-3.5 h-3.5" />
              {currentModel.name}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[180px] bg-ide-sidebar border-ide-border" align="end">
            {models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onModelChange(model.id)}
                className={`text-xs cursor-pointer ${
                  model.id === selectedModel
                    ? "bg-ide-active text-ide-text-primary"
                    : "text-ide-text-primary hover:bg-ide-hover"
                }`}
              >
                {model.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-ide-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
        >
          <Bell className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
        >
          <Search className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
        >
          <Settings className="w-4 h-4" />
        </Button>

        <div className="w-px h-4 bg-ide-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
        >
          <User className="w-4 h-4" />
        </Button>

        <div className="w-px h-4 bg-ide-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-ide-text-secondary hover:text-red-400 hover:bg-ide-hover"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
