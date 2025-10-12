import {Typography} from "@/components/ui/Typography";

export function SectionTitle({ children }: { children: React.ReactNode }) {
    return <Typography className="text-sm font-semibold text-gray-900">{children}</Typography>;
}

export function Grid2({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}
export function Grid3({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{children}</div>;
}
export function Grid4({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">{children}</div>;
}

export function Field({ children }: { children: React.ReactNode }) {
    return <div className="space-y-1.5">{children}</div>;
}
export function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
    return <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">{children}</label>;
}
export function inputClass() {
    return "w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300";
}

export function TextField({
                  id, label, value, onChange,
              }: { id: string; label: string; value?: string; onChange: (v: string) => void; }) {
    return (
        <Field>
            <Label htmlFor={id}>{label}</Label>
            <input id={id} type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} className={inputClass()} />
        </Field>
    );
}

export function NumberField({
                         id, label, value, onChange,
                     }: { id: string; label: string; value?: number | string; onChange: (v: number | "") => void; }) {
    return (
        <Field>
            <Label htmlFor={id}>{label}</Label>
            <input
                id={id}
                type="number"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputClass()}
            />
        </Field>
    );
}


export function Select({
                    id, label, value, onChange, options,
                }: {
    id: string; label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
    return (
        <Field>
            <Label htmlFor={id}>{label}</Label>
            <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass()}>
                {options.map((o) => (
                    <option key={o} value={o}>{o || "—"}</option>
                ))}
            </select>
        </Field>
    );
}

export function Checkbox({
                      id, label, checked, onChange,
                  }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; }) {
    return (
        <label className="inline-flex items-center gap-2 text-sm">
            <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}

export function CheckboxRow({
                         items,
                     }: {
    items: [label: string, checked: boolean, onChange: (v: boolean) => void][];
}) {
    return (
        <div className="flex flex-wrap gap-3">
            {items.map(([label, checked, onChange]) => (
                <Checkbox key={label} id={label} label={label} checked={checked} onChange={onChange} />
            ))}
        </div>
    );
}

export function TextArea({
                      id, label, value, onChange, rows = 3,
                  }: { id: string; label: string; value: string; onChange: (v: string) => void; rows?: number; }) {
    return (
        <Field>
            <Label htmlFor={id}>{label}</Label>
            <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass()} />
        </Field>
    );
}

export function DateInput({
                       id, label, value, onChange,
                   }: { id: string; label: string; value?: string; onChange: (v: string | null) => void; }) {
    return (
        <Field>
            <Label htmlFor={id}>{label}</Label>
            <input
                id={id}
                type="date"
                value={value || ""}
                onChange={(e) => onChange(e.target.value ? e.target.value : null)}
                className={inputClass()}
            />
        </Field>
    );
}

export function DateTimeInput({
                           id, label, value, onChange,
                       }: { id: string; label: string; value?: string; onChange: (v: string | null) => void; }) {
    return (
        <Field>
            <Label htmlFor={id}>{label}</Label>
            <input
                id={id}
                type="datetime-local"
                value={value || ""}
                onChange={(e) => onChange(e.target.value ? e.target.value : null)}
                className={inputClass()}
            />
        </Field>
    );
}