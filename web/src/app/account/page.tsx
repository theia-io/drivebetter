"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import ProfileCard from "@/containers/profile-card/profile-card";
import { useAuthStore } from "@/stores/auth";
import { Edit } from "lucide-react";
import Link from "next/link";
import Achievements from "./components/archievements";
import InstallPrompt from "./components/install";
import Preferences from "./components/preferences";
import ProfileInformation from "./components/profile-information";
import { ACHIEVEMENTS, STATS } from "./data";

export default function AccountPage() {
    const { user } = useAuthStore();

    return (
        <ProtectedLayout>
            <Container className="px-4 sm:px-6 lg:px-8">
                <div className="space-y-6 sm:space-y-8">
                    {/* Header */}
                    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                        <div>
                            <Typography
                                variant="h1"
                                className="text-2xl sm:text-3xl font-bold text-gray-900"
                            >
                                Account Settings
                            </Typography>
                            <Typography
                                variant="body1"
                                className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base"
                            >
                                Manage your driver account and preferences
                            </Typography>
                        </div>
                        <div className="w-full sm:w-auto">
                            <Button
                                variant="outline"
                                leftIcon={<Edit className="w-4 h-4" />}
                                size="sm"
                                className="w-full sm:w-auto"
                            >
                                <Link href={`/users/${user?._id}/edit`}>Edit Profile</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <ProfileCard user={user} />

                    <InstallPrompt className="bg-white p-2 rounded-lg shadow-2xl" />

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        {STATS.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <Card
                                    key={index}
                                    variant="elevated"
                                    className="hover:shadow-lg transition-shadow"
                                >
                                    <CardBody className="p-3 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <Typography
                                                    variant="body2"
                                                    className="text-gray-600 font-medium text-xs sm:text-sm"
                                                >
                                                    {stat.label}
                                                </Typography>
                                                <Typography
                                                    variant="h2"
                                                    className="text-lg sm:text-2xl font-bold text-gray-900 mt-1"
                                                >
                                                    {stat.value}
                                                </Typography>
                                            </div>
                                            <div
                                                className={`p-2 sm:p-3 rounded-xl ${stat.bgColor} flex-shrink-0`}
                                            >
                                                <Icon
                                                    className={`w-4 h-4 sm:w-6 sm:h-6 ${stat.color}`}
                                                />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* Profile Information */}
                        <ProfileInformation user={user} />

                        {/* Preferences & Achievements */}
                        <div className="space-y-6">
                            <Preferences />

                            <Achievements achievements={ACHIEVEMENTS} />
                        </div>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
