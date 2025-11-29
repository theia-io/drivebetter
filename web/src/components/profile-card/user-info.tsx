import { Typography } from "@/components/ui";
import type { User } from "@/types/user";
import { cn } from "@/utils/css";
import { Shield } from "lucide-react";

export default function UserInfo({ className, user }: { className?: string; user: User }) {
    return (
        <div className={cn(className, "mt-3 sm:mt-0 flex-1")}>
            <Typography variant="h2" className="text-xl sm:text-2xl font-bold text-gray-900">
                {user?.name || "John Driver"}
            </Typography>
            <Typography variant="body1" className="text-gray-600 mt-1 text-sm sm:text-base">
                {user?.email || "john.driver@example.com"}
            </Typography>
            
            <div className="flex items-center mt-1 sm:mt-2">
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 mr-2" />
                <div className="flex flex-wrap items-center">
                    {user?.roles.map((role, index) => (
                        <span
                            key={index}
                            className="ml-1 text-gray-600/80 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium"
                        >
                            {role.trim()}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
