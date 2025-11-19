"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, CardHeader, Container, Typography } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import {
    Activity,
    Calendar,
    Car,
    Clock,
    DollarSign,
    MapPin,
    Star,
    TrendingUp,
    Users,
} from "lucide-react";

export default function DashboardPage() {
    const { user } = useAuthStore();

    const stats = [
        {
            title: "Today's Rides",
            value: "5",
            change: "+12%",
            icon: Car,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
        },
        {
            title: "This Week",
            value: "23",
            change: "+8%",
            icon: Calendar,
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
        },
        {
            title: "Rating",
            value: "4.8",
            change: "+0.2",
            icon: Star,
            color: "text-yellow-600",
            bgColor: "bg-yellow-50",
            borderColor: "border-yellow-200",
        },
        {
            title: "Earnings",
            value: "$1,250",
            change: "+15%",
            icon: DollarSign,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-200",
        },
    ];

    const recentRides = [
        {
            id: 1,
            passenger: "Sarah Johnson",
            pickup: "Downtown",
            destination: "Airport",
            time: "2:30 PM",
            status: "completed",
            rating: 5,
        },
        {
            id: 2,
            passenger: "Mike Chen",
            pickup: "Mall",
            destination: "University",
            time: "4:15 PM",
            status: "in-progress",
            rating: null,
        },
        {
            id: 3,
            passenger: "Emma Davis",
            pickup: "Hospital",
            destination: "Home",
            time: "6:00 PM",
            status: "scheduled",
            rating: null,
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800 border-green-200";
            case "in-progress":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "scheduled":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

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
                                Welcome back, {user?.name}! 👋
                            </Typography>
                            <Typography
                                variant="body1"
                                className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base"
                            >
                                Here&apos;s what&apos;s happening with your rides today.
                            </Typography>
                        </div>
                        <div className="w-full sm:w-auto">
                            <Button
                                variant="outline"
                                leftIcon={<Activity className="w-4 h-4" />}
                                className="w-full sm:w-auto"
                                size="sm"
                            >
                                <span className="hidden sm:inline">View Analytics</span>
                                <span className="sm:hidden">Analytics</span>
                            </Button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        {stats.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <Card
                                    key={index}
                                    variant="elevated"
                                    className="hover:shadow-xl transition-shadow duration-200"
                                >
                                    <CardBody className="p-3 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <Typography
                                                    variant="body2"
                                                    className="text-gray-600 font-medium text-xs sm:text-sm"
                                                >
                                                    {stat.title}
                                                </Typography>
                                                <Typography
                                                    variant="h2"
                                                    className="text-lg sm:text-2xl font-bold text-gray-900 mt-1"
                                                >
                                                    {stat.value}
                                                </Typography>
                                                <div className="flex items-center mt-1 sm:mt-2">
                                                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
                                                    <span className="text-xs sm:text-sm text-green-600 font-medium">
                                                        {stat.change}
                                                    </span>
                                                    <span className="text-xs sm:text-sm text-gray-500 ml-1 hidden sm:inline">
                                                        from last week
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className={`p-2 sm:p-3 rounded-xl ${stat.bgColor} ${stat.borderColor} border flex-shrink-0`}
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

                    {/* Recent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        {/* Recent Rides */}
                        <Card variant="elevated">
                            <CardHeader className="pb-3 sm:pb-4">
                                <div className="flex items-center justify-between">
                                    <Typography
                                        variant="h3"
                                        className="text-base sm:text-lg font-semibold text-gray-900"
                                    >
                                        Recent Rides
                                    </Typography>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs sm:text-sm"
                                    >
                                        View All
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardBody className="pt-0">
                                <div className="space-y-3 sm:space-y-4">
                                    {recentRides.map((ride) => (
                                        <div
                                            key={ride.id}
                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors space-y-2 sm:space-y-0"
                                        >
                                            <div className="flex items-center space-x-3 sm:space-x-4">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <Car className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <Typography
                                                        variant="body1"
                                                        className="font-medium text-gray-900 text-sm sm:text-base truncate"
                                                    >
                                                        {ride.passenger}
                                                    </Typography>
                                                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                                                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                                                        <span className="truncate">
                                                            {ride.pickup} → {ride.destination}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right">
                                                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                                                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                                    {ride.time}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span
                                                        className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                                                            ride.status
                                                        )}`}
                                                    >
                                                        {ride.status}
                                                    </span>
                                                    {ride.rating && (
                                                        <div className="flex items-center">
                                                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
                                                            <span className="text-xs sm:text-sm text-gray-600 ml-1">
                                                                {ride.rating}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>

                        {/* Quick Actions */}
                        <Card variant="elevated">
                            <CardHeader className="pb-3 sm:pb-4">
                                <Typography
                                    variant="h3"
                                    className="text-base sm:text-lg font-semibold text-gray-900"
                                >
                                    Quick Actions
                                </Typography>
                            </CardHeader>
                            <CardBody className="pt-0">
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <Button
                                        variant="outline"
                                        className="h-16 sm:h-20 flex-col"
                                        leftIcon={<Car className="w-4 h-4 sm:w-6 sm:h-6" />}
                                        size="sm"
                                    >
                                        <span className="text-xs sm:text-sm font-medium">
                                            Start Ride
                                        </span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-16 sm:h-20 flex-col"
                                        leftIcon={<Calendar className="w-4 h-4 sm:w-6 sm:h-6" />}
                                        size="sm"
                                    >
                                        <span className="text-xs sm:text-sm font-medium">
                                            Schedule
                                        </span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-16 sm:h-20 flex-col"
                                        leftIcon={<Users className="w-4 h-4 sm:w-6 sm:h-6" />}
                                        size="sm"
                                    >
                                        <span className="text-xs sm:text-sm font-medium">
                                            Groups
                                        </span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-16 sm:h-20 flex-col"
                                        leftIcon={<Activity className="w-4 h-4 sm:w-6 sm:h-6" />}
                                        size="sm"
                                    >
                                        <span className="text-xs sm:text-sm font-medium">
                                            Analytics
                                        </span>
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
