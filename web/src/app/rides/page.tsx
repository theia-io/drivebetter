"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import {
  Button,
  Card,
  CardBody,
  Container,
  Typography
} from "@/components/ui";
import {
  Calendar,
  Car,
  Clock,
  DollarSign,
  Filter,
  MapPin,
  Navigation,
  Plus,
  Search,
  Star,
  User,
} from "lucide-react";
import Link from "next/link";

export default function RidesPage() {
  const mockRides = [
    {
      id: 1,
      passenger: "Sarah Johnson",
      pickup: "Downtown Plaza",
      destination: "LAX Airport",
      time: "09:00 AM",
      date: "Today",
      status: "completed",
      rating: 5,
      fare: "$45.50",
      distance: "12.3 mi",
      duration: "28 min",
    },
    {
      id: 2,
      passenger: "Mike Chen",
      pickup: "Beverly Hills",
      destination: "Santa Monica Pier",
      time: "10:30 AM",
      date: "Today",
      status: "in-progress",
      rating: null,
      fare: "$32.00",
      distance: "8.7 mi",
      duration: "22 min",
    },
    {
      id: 3,
      passenger: "Emma Davis",
      pickup: "Hollywood Blvd",
      destination: "Griffith Observatory",
      time: "02:15 PM",
      date: "Today",
      status: "scheduled",
      rating: null,
      fare: "$28.75",
      distance: "6.2 mi",
      duration: "18 min",
    },
    {
      id: 4,
      passenger: "David Wilson",
      pickup: "Venice Beach",
      destination: "Downtown LA",
      time: "04:45 PM",
      date: "Today",
      status: "scheduled",
      rating: null,
      fare: "$38.20",
      distance: "15.1 mi",
      duration: "35 min",
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Star className="w-4 h-4" />;
      case "in-progress":
        return <Navigation className="w-4 h-4" />;
      case "scheduled":
        return <Clock className="w-4 h-4" />;
      default:
        return <Car className="w-4 h-4" />;
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
                Rides
              </Typography>
              <Typography variant="body1" className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                Manage your ride history and upcoming trips
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
                leftIcon={<Plus className="w-4 h-4" />}
                size="sm"
                className="w-full sm:w-auto"
              >
                  <Link href="/rides/new">New Ride</Link>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <Card
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
                      Today&apos;s Rides
                    </Typography>
                    <Typography
                      variant="h2"
                      className="text-lg sm:text-2xl font-bold text-gray-900 mt-1"
                    >
                      4
                    </Typography>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-50 rounded-xl border border-blue-200 flex-shrink-0">
                    <Car className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card
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
                      Total Earnings
                    </Typography>
                    <Typography
                      variant="h2"
                      className="text-lg sm:text-2xl font-bold text-gray-900 mt-1"
                    >
                      $144.45
                    </Typography>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-50 rounded-xl border border-green-200 flex-shrink-0">
                    <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card
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
                      Distance
                    </Typography>
                    <Typography
                      variant="h2"
                      className="text-lg sm:text-2xl font-bold text-gray-900 mt-1"
                    >
                      42.3 mi
                    </Typography>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-50 rounded-xl border border-purple-200 flex-shrink-0">
                    <MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card
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
                      Avg Rating
                    </Typography>
                    <Typography
                      variant="h2"
                      className="text-lg sm:text-2xl font-bold text-gray-900 mt-1"
                    >
                      4.8
                    </Typography>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-50 rounded-xl border border-yellow-200 flex-shrink-0">
                    <Star className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card variant="elevated">
            <CardBody className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Search rides by passenger name or location..."
                    className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                  />
                </div>
                <Button
                  variant="outline"
                  leftIcon={<Calendar className="w-4 h-4" />}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Date Range
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Rides List */}
          <div className="space-y-3 sm:space-y-4">
            {mockRides.map((ride) => (
              <Card
                key={ride.id}
                variant="elevated"
                className="hover:shadow-lg transition-shadow"
              >
                <CardBody className="p-4 sm:p-6">
                  <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2 space-y-2 sm:space-y-0">
                          <Typography
                            variant="h3"
                            className="text-base sm:text-lg font-semibold text-gray-900 truncate"
                          >
                            {ride.passenger}
                          </Typography>
                          <span
                            className={`inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                              ride.status
                            )} w-fit`}
                          >
                            {getStatusIcon(ride.status)}
                            <span className="ml-1 capitalize">
                              {ride.status}
                            </span>
                          </span>
                        </div>

                        <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-4 mb-3 sm:mb-4">
                          <div className="flex items-center text-xs sm:text-sm text-gray-600">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="font-medium">From:</span>
                            <span className="ml-1 truncate">{ride.pickup}</span>
                          </div>
                          <div className="flex items-center text-xs sm:text-sm text-gray-600">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="font-medium">To:</span>
                            <span className="ml-1 truncate">{ride.destination}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div className="flex items-center text-gray-600">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{ride.time}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{ride.fare}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Navigation className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{ride.distance}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{ride.duration}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2 sm:ml-4">
                      {ride.rating && (
                        <div className="flex items-center">
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
                          <span className="text-xs sm:text-sm font-medium text-gray-900 ml-1">
                            {ride.rating}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
                          Details
                        </Button>
                        {ride.status === "scheduled" && (
                          <Button size="sm" className="w-full sm:w-auto text-xs">
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Load More Rides
            </Button>
          </div>
        </div>
      </Container>
    </ProtectedLayout>
  );
}
