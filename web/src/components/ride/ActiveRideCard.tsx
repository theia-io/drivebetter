"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "../ui";

export type ActiveRideCardProps = {
    clickHandler: () => void;
    header: string;
};

export default function ActiveRideCard({ clickHandler, header }: ActiveRideCardProps) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 shadow-md bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
            <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={clickHandler}
                className="border-white/80 bg-white/10 hover:bg-white/20 text-xs font-semibold"
            >
                Back
            </Button>
            <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-white/90">
                    Active ride mode
                </div>
                <div className="text-sm sm:text-base font-semibold truncate">{header}</div>
            </div>
        </div>
    );
}
