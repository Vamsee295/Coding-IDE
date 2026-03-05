import { Switch } from '@/react-app/components/ui/switch';
import { Slider } from '@/react-app/components/ui/slider';
import { Input } from '@/react-app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react-app/components/ui/select';

// ─── Shared types ───────────────────────────────────────────────────────────

interface BaseProps {
    label: string;
    description?: string;
    id?: string;
}

interface ToggleRow extends BaseProps {
    type: 'toggle';
    value: boolean;
    onChange: (v: boolean) => void;
}

interface SelectRow extends BaseProps {
    type: 'select';
    value: string;
    options: { label: string; value: string }[];
    onChange: (v: string) => void;
}

interface InputRow extends BaseProps {
    type: 'input';
    value: string;
    placeholder?: string;
    onChange: (v: string) => void;
}

interface NumberRow extends BaseProps {
    type: 'number';
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (v: number) => void;
}

interface SliderRow extends BaseProps {
    type: 'slider';
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (v: number) => void;
}

export type SettingRowProps = ToggleRow | SelectRow | InputRow | NumberRow | SliderRow;

// ─── Component ──────────────────────────────────────────────────────────────

export default function SettingRow(props: SettingRowProps) {
    return (
        <div className="flex items-start justify-between gap-6 py-3 px-1 group hover:bg-[rgba(255,255,255,0.015)] rounded-lg transition-colors" id={props.id}>
            <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-ide-text-primary leading-snug">{props.label}</div>
                {props.description && (
                    <div className="text-[11px] text-ide-text-secondary mt-0.5 leading-relaxed">{props.description}</div>
                )}
            </div>

            <div className="flex-shrink-0 pt-0.5">
                {props.type === 'toggle' && (
                    <Switch checked={props.value} onCheckedChange={props.onChange} />
                )}

                {props.type === 'select' && (
                    <div className="w-48">
                        <Select value={props.value} onValueChange={props.onChange}>
                            <SelectTrigger className="h-8 text-xs bg-[rgba(15,17,26,0.5)] border-ide-border">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {props.options.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {props.type === 'input' && (
                    <Input
                        value={props.value}
                        onChange={e => props.onChange(e.target.value)}
                        placeholder={props.placeholder}
                        className="w-56 h-8 text-xs font-mono bg-[rgba(15,17,26,0.5)] border-ide-border"
                    />
                )}

                {props.type === 'number' && (
                    <Input
                        type="number"
                        value={props.value}
                        min={props.min}
                        max={props.max}
                        step={props.step ?? 1}
                        onChange={e => props.onChange(Number(e.target.value))}
                        className="w-24 h-8 text-xs font-mono bg-[rgba(15,17,26,0.5)] border-ide-border text-center"
                    />
                )}

                {props.type === 'slider' && (
                    <div className="flex items-center gap-3">
                        <Slider
                            value={[props.value]}
                            min={props.min}
                            max={props.max}
                            step={props.step ?? 1}
                            onValueChange={([v]) => props.onChange(v)}
                            className="w-40"
                        />
                        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded min-w-[3rem] text-center">
                            {props.value}{props.unit ?? ''}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
