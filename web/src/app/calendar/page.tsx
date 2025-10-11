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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  List,
  MapPin,
  Plus,
  User
} from "lucide-react";

export default function CalendarPage() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = currentDate.getDate();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays = [];

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      isToday: false,
      hasRides: false,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const hasRides = day % 3 === 0 || day % 5 === 0;
    calendarDays.push({
      day,
      isCurrentMonth: true,
      isToday: day === today,
      hasRides,
    });
  }

  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      isToday: false,
      hasRides: false,
    });
  }

  const upcomingRides = [
    {
      id: 1,
      passenger: "Sarah Johnson",
      time: "9:00 AM",
      pickup: "Downtown",
      destination: "Airport",
      status: "scheduled",
    },
    {
      id: 2,
      passenger: "Mike Chen",
      time: "2:30 PM",
      pickup: "Beverly Hills",
      destination: "Santa Monica",
      status: "scheduled",
    },
    {
      id: 3,
      passenger: "Emma Davis",
      time: "6:00 PM",
      pickup: "Hollywood",
      destination: "Griffith Observatory",
      status: "scheduled",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
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
                Calendar
              </Typography>
              <Typography variant="body1" className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                View and manage your ride schedule
              </Typography>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button
                variant="outline"
                leftIcon={<Filter className="w-4 h-4" />}
                size="sm"
                className="w-full sm:w-auto"
              >
                Filter
              </Button>
              <Button 
                variant="outline" 
                leftIcon={<List className="w-4 h-4" />}
                size="sm"
                className="w-full sm:w-auto"
              >
                List View
              </Button>
              <Button 
                leftIcon={<Plus className="w-4 h-4" />}
                size="sm"
                className="w-full sm:w-auto"
              >
                Schedule Ride
              </Button>
            </div>
          </div>

          {/* Calendar Navigation */}
          <Card variant="elevated">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>
                  <Typography
                    variant="h3"
                    className="text-xl font-semibold text-gray-900"
                  >
                    {monthNames[currentMonth]} {currentYear}
                  </Typography>
                  <Button
                    variant="outline"
                    size="sm"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<CalendarIcon className="w-4 h-4" />}
                >
                  Today
                </Button>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-3 sm:mb-4">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="text-center font-semibold text-gray-700 py-2 sm:py-3 text-xs sm:text-sm"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayData, index) => (
                  <div
                    key={index}
                    className={`h-16 sm:h-24 border rounded-lg p-1 sm:p-2 cursor-pointer transition-colors ${
                      dayData.isCurrentMonth
                        ? "bg-white hover:bg-gray-50"
                        : "bg-gray-50 text-gray-400"
                    } ${
                      dayData.isToday
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200"
                    } ${
                      dayData.hasRides && dayData.isCurrentMonth
                        ? "border-blue-300 bg-blue-50"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div
                        className={`text-xs sm:text-sm font-medium ${
                          dayData.isToday ? "text-indigo-600" : "text-gray-900"
                        }`}
                      >
                        {dayData.day}
                      </div>
                      {dayData.hasRides && dayData.isCurrentMonth && (
                        <div className="mt-1 flex-1">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mx-auto"></div>
                          <div className="text-xs text-blue-600 text-center mt-1 hidden sm:block">
                            {dayData.day % 3 === 0 ? "3 rides" : "2 rides"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Upcoming Rides */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2">
              <Card variant="elevated">
                <CardHeader className="pb-4">
                  <Typography
                    variant="h3"
                    className="text-lg font-semibold text-gray-900"
                  >
                    Today&apos;s Schedule
                  </Typography>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-4">
                    {upcomingRides.map((ride) => (
                      <div
                        key={ride.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-indigo-600" />
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
                          <div className="flex items-center text-sm text-gray-600 mb-2">
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
                            <Button size="sm">Start</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Quick Stats */}
              <Card variant="elevated">
                <CardHeader className="pb-4">
                  <Typography
                    variant="h3"
                    className="text-lg font-semibold text-gray-900"
                  >
                    This Week
                  </Typography>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Rides</span>
                      <span className="text-lg font-semibold text-gray-900">
                        23
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Earnings</span>
                      <span className="text-lg font-semibold text-gray-900">
                        $1,250
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Distance</span>
                      <span className="text-lg font-semibold text-gray-900">
                        156 mi
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Rating</span>
                      <span className="text-lg font-semibold text-gray-900">
                        4.8 ⭐
                      </span>
                    </div>
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
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Schedule New Ride
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      leftIcon={<CalendarIcon className="w-4 h-4" />}
                    >
                      View Full Calendar
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      leftIcon={<List className="w-4 h-4" />}
                    >
                      Export Schedule
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </ProtectedLayout>
  );
}
