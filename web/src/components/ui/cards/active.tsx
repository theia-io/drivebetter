export default function ActiveCard({
    content,
    header,
}: {
    content: React.ReactNode;
    header: string;
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 shadow-md bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-white/90">
                {header}
            </div>
            <div className="text-sm sm:text-base font-semibold truncate">{content}</div>
        </div>
    );
}
