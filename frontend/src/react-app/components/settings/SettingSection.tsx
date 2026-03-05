import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SettingSectionProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    children: ReactNode;
    defaultOpen?: boolean;
    count?: number;
}

export default function SettingSection({ icon, title, description, children, defaultOpen = true, count }: SettingSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2.5 py-2 px-1 group"
            >
                <span className="text-ide-text-secondary group-hover:text-ide-text-primary transition-colors">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
                {icon && <span className="text-indigo-400">{icon}</span>}
                <span className="text-sm font-semibold text-ide-text-primary tracking-wide">{title}</span>
                {count !== undefined && (
                    <span className="text-[10px] font-mono bg-ide-hover text-ide-text-secondary px-1.5 py-0.5 rounded ml-1">{count}</span>
                )}
                {description && (
                    <span className="text-[11px] text-ide-text-secondary ml-2 hidden lg:inline">{description}</span>
                )}
            </button>

            {isOpen && (
                <div className="pl-7 border-l border-ide-border/40 ml-2 mt-1 space-y-0.5">
                    {children}
                </div>
            )}
        </div>
    );
}
