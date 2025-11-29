import {useRouter} from "next/navigation";
import {dt} from "@/components/ui/commmon";
import {useState} from "react";
import {ChevronDown} from "lucide-react";

type AccordionItemProps = {
    id: string;
    title: string;
    icon?: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
};

export function AccordionItem({
                           id,
                           title,
                           icon,
                           defaultOpen = false,
                           children,
                       }: AccordionItemProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-200 rounded-lg">
            <h2 id={`accordion-heading-${id}`}>
                <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-gray-900 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={`accordion-body-${id}`}
                >
                    <span className="flex items-center gap-2">
                        {icon}
                        <span className="text-sm font-semibold">{title}</span>
                    </span>
                    <ChevronDown
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                            open ? "rotate-180" : ""
                        }`}
                    />
                </button>
            </h2>
            <div
                id={`accordion-body-${id}`}
                className={open ? "" : "hidden"}
                aria-labelledby={`accordion-heading-${id}`}
            >
                <div className="p-4 sm:p-5 border-t border-gray-200">
                    {children}
                </div>
            </div>
        </div>
    );
}