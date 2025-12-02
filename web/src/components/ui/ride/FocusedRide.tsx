import { useMyRides } from "@/stores/rides";
import { Eye } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import ActiveCard from "../cards/active";

export default function FocusedRide() {
    const { data, isLoading, mutate } = useMyRides();
    const pathname = usePathname();

    const activeRides = useMemo(() => data?.items.filter((r) => r.status !== "completed"), [data]);
    const [activeRide, ...restActiveRides] = activeRides ?? [];

    return (
        <>
            {activeRide && (
                <div className="relative">
                    <Link href={`/rides/${activeRide._id}`}>
                        <ActiveCard
                            header="Current ride"
                            content={`${activeRide.from} → ${activeRide.to}`}
                        />
                    </Link>

                    {restActiveRides.length > 0 && !pathname.includes("/my-rides") && (
                        <div className="absolute -translate-y-1/2 top-1/2 right-2 z-10 bg-white/90 backdrop-blur-sm rounded p-2 shadow-md">
                            <Link
                                href="/my-rides"
                                className="text-sm text-gray-500 flex items-center gap-2"
                            >
                                <Eye className="w-4 h-4" />
                                {restActiveRides.length} more rides...
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
