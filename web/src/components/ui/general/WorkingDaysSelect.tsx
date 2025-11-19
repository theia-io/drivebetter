import { Field, Label, inputClass } from "@/components/ui/commmon";

export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_OPTIONS: {
    value: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
    label: string;
}[] = [
    { value: "mon", label: "Monday" },
    { value: "tue", label: "Tuesday" },
    { value: "wed", label: "Wednesday" },
    { value: "thu", label: "Thursday" },
    { value: "fri", label: "Friday" },
    { value: "sat", label: "Saturday" },
    { value: "sun", label: "Sunday" },
];

export function WorkingDaysSelect({
    value,
    onChange,
    id = "workingDays",
}: {
    value: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">;
    onChange: (days: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">) => void;
    id?: string;
}) {
    return (
        <Field>
            <Label htmlFor={id}>Working Days</Label>
            <select
                id={id}
                multiple
                value={value}
                onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map(
                        (o) => o.value as (typeof DAY_OPTIONS)[number]["value"]
                    );
                    onChange(selected);
                }}
                className={inputClass()}
                size={7}
            >
                {DAY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Ctrl/Cmd-click to toggle multiple.</p>
        </Field>
    );
}
