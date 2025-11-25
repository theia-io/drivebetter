import { Card, CardBody } from "@/components/ui";
import { cn } from "@/utils/css";
import { Camera, User as UserIcon } from "lucide-react";

import type { User } from "@/types/user";
import Review from "./review";
import UserInfo from "./user-info";

export default function ProfileCard({ className, user }: { className?: string; user: User }) {
    return (
        <Card variant="elevated" className={cn(className, "overflow-hidden")}>
            <CardBody className="p-0">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-24 sm:h-32"></div>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 -mt-12 sm:-mt-16">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                                <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />

                                <button className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                                    <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                </button>
                            </div>

                            <Review className="ml-auto bg-white p-2 rounded-lg shadow-2xl" />
                        </div>

                        <div className="flex flex-col gap-2 min-w-[25dvw]">
                            <UserInfo className="bg-white p-2 rounded-lg shadow-2xl" user={user} />
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
