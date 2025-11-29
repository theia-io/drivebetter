import { cn } from "@/utils/css";
import { Star } from "lucide-react";

export default function Review({ className }: { className?: string }) {
    return (
        <div className={cn(className)}>
            <div className="flex items-center gap-2 w-full">
                <div className="flex items-center">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />

                    <span className="text-base sm:text-lg font-semibold text-gray-900 ml-1">
                        4.6
                    </span>
                </div>

                <span className="text-xs sm:text-sm text-gray-600">(1,247 reviews)</span>
            </div>
        </div>
    );
}
