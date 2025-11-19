import { Typography } from "@/components/ui/general/Typography";

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
    return (
        <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
            {children}
        </label>
    );
}

export function inputClass(error?: string) {
    return [
        "w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        error ? "border-red-300" : "border-gray-300",
    ].join(" ");
}

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
    return (
        <label htmlFor={htmlFor} className="flex items-center text-sm font-medium text-gray-700">
            {children}
        </label>
    );
}
export function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-sm text-red-600">{message}</p>;
}

export function TextField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value?: string;
    onChange: (v: string) => void;
}) {
    return (
        <Field>
            <Label htmlFor={id}>{label}</Label>
            <input
                id={id}
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className={inputClass()}
            />
        </Field>
    );
}

export function NumberField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value?: number | string;
    onChange: (v: number | "") => void;
}) {
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
    id,
    label,
    value,
    onChange,
    options,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
}) {
    return (
        <Field>
            <Label htmlFor={id}>{label}</Label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputClass()}
            >
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o || "—"}
                    </option>
                ))}
            </select>
        </Field>
    );
}

export function Checkbox({
    id,
    label,
    checked,
    onChange,
}: {
    id: string;
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="inline-flex items-center gap-2 text-sm">
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
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
                <Checkbox
                    key={label}
                    id={label}
                    label={label}
                    checked={checked}
                    onChange={onChange}
                />
            ))}
        </div>
    );
}

export function TextArea({
    id,
    label,
    value,
    onChange,
    rows = 3,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    rows?: number;
}) {
    return (
        <Field>
            <Label htmlFor={id}>{label}</Label>
            <textarea
                id={id}
                rows={rows}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputClass()}
            />
        </Field>
    );
}

export function DateInput({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value?: string;
    onChange: (v: string | null) => void;
}) {
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
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value?: string;
    onChange: (v: string | null) => void;
}) {
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

export function Section({
    title,
    icon,
    children,
}: {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <Typography className="font-semibold text-gray-900">{title}</Typography>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
        </div>
    );
}

export function KV({ k, v }: { k: string; v?: string | number | null }) {
    return (
        <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-gray-500 text-xs">{k}</div>
            <div className="text-gray-900 text-sm break-words">{v ?? "—"}</div>
        </div>
    );
}

/* ------------------------------- Helpers ------------------------------- */

export function dt(x?: string | null) {
    if (!x) return "—";
    try {
        return new Date(x).toLocaleString();
    } catch {
        return "—";
    }
}

export function num(x?: number | null) {
    return typeof x === "number" && !Number.isNaN(x) ? String(x) : "—";
}
export function bool(x?: boolean | null) {
    return x ? "Yes" : "No";
}
export function arr(a?: string[] | null) {
    return a && a.length ? a.join(", ") : "—";
}
export function coords(c?: [number, number]) {
    return c && c.length === 2 ? `${c[1].toFixed(5)}, ${c[0].toFixed(5)}` : "—";
}
export function money(cents?: number | null) {
    if (typeof cents !== "number") return "—";
    return `$${(cents / 100).toFixed(2)}`;
}

/* icon shims to avoid extra deps variations */
export function DollarIcon() {
    return <span className="inline-block w-4 h-4 rounded-sm border border-gray-400" />;
}
export function CalendarIcon() {
    return <span className="inline-block w-4 h-4 rounded-sm border border-gray-400" />;
}
