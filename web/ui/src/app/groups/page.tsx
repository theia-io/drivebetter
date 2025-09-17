"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Typography,
} from "@/components/ui";
import {
  Activity,
  Calendar,
  Filter,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Star,
  UserPlus,
  Users,
} from "lucide-react";

export default function GroupsPage() {
  const mockGroups = [
    {
      id: 1,
      name: "Morning Commuters",
      description: "Early morning drivers serving downtown area",
      members: 12,
      activeRides: 8,
      totalRides: 156,
      rating: 4.8,
      location: "Downtown LA",
      created: "2 months ago",
      status: "active",
    },
    {
      id: 2,
      name: "Evening Shift",
      description: "Night shift drivers for late night rides",
      members: 15,
      activeRides: 5,
      totalRides: 203,
      rating: 4.6,
      location: "Hollywood",
      created: "1 month ago",
      status: "active",
    },
    {
      id: 3,
      name: "Weekend Warriors",
      description: "Weekend drivers for special events",
      members: 8,
      activeRides: 3,
      totalRides: 89,
      rating: 4.9,
      location: "Santa Monica",
      created: "3 weeks ago",
      status: "active",
    },
    {
      id: 4,
      name: "Airport Express",
      description: "Specialized airport transfer service",
      members: 6,
      activeRides: 2,
      totalRides: 67,
      rating: 4.7,
      location: "LAX Area",
      created: "1 week ago",
      status: "active",
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: "join",
      user: "Sarah Johnson",
      group: "Morning Commuters",
      time: "2 hours ago",
    },
    {
      id: 2,
      type: "ride",
      user: "Mike Chen",
      group: "Evening Shift",
      time: "4 hours ago",
    },
    {
      id: 3,
      type: "message",
      user: "Emma Davis",
      group: "Weekend Warriors",
      time: "6 hours ago",
    },
  ];

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
                Driver Groups
              </Typography>
              <Typography variant="body1" className="text-gray-600 mt-2">
                Connect with other drivers and manage group activities
              </Typography>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <Button
                variant="outline"
                leftIcon={<Filter className="w-4 h-4" />}
              >
                Filter
              </Button>
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Create Group
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card
              variant="elevated"
              className="hover:shadow-lg transition-shadow"
            >
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography
                      variant="body2"
                      className="text-gray-600 font-medium"
                    >
                      Total Groups
                    </Typography>
                    <Typography
                      variant="h2"
                      className="text-2xl font-bold text-gray-900 mt-1"
                    >
                      4
                    </Typography>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card
              variant="elevated"
              className="hover:shadow-lg transition-shadow"
            >
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography
                      variant="body2"
                      className="text-gray-600 font-medium"
                    >
                      Total Members
                    </Typography>
                    <Typography
                      variant="h2"
                      className="text-2xl font-bold text-gray-900 mt-1"
                    >
                      41
                    </Typography>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                    <UserPlus className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card
              variant="elevated"
              className="hover:shadow-lg transition-shadow"
            >
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography
                      variant="body2"
                      className="text-gray-600 font-medium"
                    >
                      Active Rides
                    </Typography>
                    <Typography
                      variant="h2"
                      className="text-2xl font-bold text-gray-900 mt-1"
                    >
                      18
                    </Typography>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card
              variant="elevated"
              className="hover:shadow-lg transition-shadow"
            >
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography
                      variant="body2"
                      className="text-gray-600 font-medium"
                    >
                      Avg Rating
                    </Typography>
                    <Typography
                      variant="h2"
                      className="text-2xl font-bold text-gray-900 mt-1"
                    >
                      4.8
                    </Typography>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card variant="elevated">
            <CardBody className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search groups by name or location..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <Button
                  variant="outline"
                  leftIcon={<Calendar className="w-4 h-4" />}
                >
                  Sort by Date
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockGroups.map((group) => (
              <Card
                key={group.id}
                variant="elevated"
                className="hover:shadow-lg transition-shadow"
              >
                <CardBody className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <Typography
                          variant="h3"
                          className="text-lg font-semibold text-gray-900"
                        >
                          {group.name}
                        </Typography>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          {group.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-gray-900 ml-1">
                        {group.rating}
                      </span>
                    </div>
                  </div>

                  <Typography variant="body2" className="text-gray-600 mb-4">
                    {group.description}
                  </Typography>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Typography
                        variant="h3"
                        className="text-xl font-bold text-gray-900"
                      >
                        {group.members}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Members
                      </Typography>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Typography
                        variant="h3"
                        className="text-xl font-bold text-gray-900"
                      >
                        {group.activeRides}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Active Rides
                      </Typography>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Typography variant="body2" className="text-gray-500">
                      Created {group.created}
                    </Typography>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<MessageCircle className="w-4 h-4" />}
                      >
                        Chat
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<Settings className="w-4 h-4" />}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <Card variant="elevated">
            <CardHeader className="pb-4">
              <Typography
                variant="h3"
                className="text-lg font-semibold text-gray-900"
              >
                Recent Activity
              </Typography>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      {activity.type === "join" && (
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                      )}
                      {activity.type === "ride" && (
                        <Activity className="w-5 h-5 text-indigo-600" />
                      )}
                      {activity.type === "message" && (
                        <MessageCircle className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Typography
                        variant="body1"
                        className="font-medium text-gray-900"
                      >
                        {activity.user}{" "}
                        {activity.type === "join"
                          ? "joined"
                          : activity.type === "ride"
                          ? "completed a ride in"
                          : "sent a message in"}{" "}
                        {activity.group}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        {activity.time}
                      </Typography>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
    </ProtectedLayout>
  );
}
