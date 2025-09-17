"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Typography
} from "@/components/ui";
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
      <Container>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Typography
                variant="h1"
                className="text-3xl font-bold text-gray-900"
              >
                Welcome back, {user?.name}! 👋
              </Typography>
              <Typography variant="body1" className="text-gray-600 mt-2">
                Here&apos;s what&apos;s happening with your rides today.
              </Typography>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button
                variant="outline"
                leftIcon={<Activity className="w-4 h-4" />}
              >
                View Analytics
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  variant="elevated"
                  className="hover:shadow-xl transition-shadow duration-200"
                >
                  <CardBody className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Typography
                          variant="body2"
                          className="text-gray-600 font-medium"
                        >
                          {stat.title}
                        </Typography>
                        <Typography
                          variant="h2"
                          className="text-2xl font-bold text-gray-900 mt-1"
                        >
                          {stat.value}
                        </Typography>
                        <div className="flex items-center mt-2">
                          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600 font-medium">
                            {stat.change}
                          </span>
                          <span className="text-sm text-gray-500 ml-1">
                            from last week
                          </span>
                        </div>
                      </div>
                      <div
                        className={`p-3 rounded-xl ${stat.bgColor} ${stat.borderColor} border`}
                      >
                        <Icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Rides */}
            <Card variant="elevated">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Typography
                    variant="h3"
                    className="text-lg font-semibold text-gray-900"
                  >
                    Recent Rides
                  </Typography>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="space-y-4">
                  {recentRides.map((ride) => (
                    <div
                      key={ride.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Car className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <Typography
                            variant="body1"
                            className="font-medium text-gray-900"
                          >
                            {ride.passenger}
                          </Typography>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-1" />
                            {ride.pickup} → {ride.destination}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <Clock className="w-4 h-4 mr-1" />
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
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm text-gray-600 ml-1">
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
              <CardHeader className="pb-4">
                <Typography
                  variant="h3"
                  className="text-lg font-semibold text-gray-900"
                >
                  Quick Actions
                </Typography>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col"
                    leftIcon={<Car className="w-6 h-6" />}
                  >
                    <span className="text-sm font-medium">Start Ride</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col"
                    leftIcon={<Calendar className="w-6 h-6" />}
                  >
                    <span className="text-sm font-medium">Schedule</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col"
                    leftIcon={<Users className="w-6 h-6" />}
                  >
                    <span className="text-sm font-medium">Groups</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col"
                    leftIcon={<Activity className="w-6 h-6" />}
                  >
                    <span className="text-sm font-medium">Analytics</span>
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
