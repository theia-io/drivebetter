'use client'

import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuthStore } from '@/stores/auth'
import { Card, CardHeader, CardBody, Typography, Container, Button } from '@/components/ui'
import { 
  User, 
  Mail, 
  Shield, 
  Star, 
  DollarSign, 
  Calendar,
  MapPin,
  Car,
  Bell,
  Settings,
  Edit,
  Camera,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Award
} from 'lucide-react'
import Link from "next/link";

export default function AccountPage() {
  const { user } = useAuthStore()

  const stats = [
    { label: 'Total Rides', value: '1,247', icon: Car, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Average Rating', value: '4.8', icon: Star, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { label: 'Total Earnings', value: '$15,420', icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: 'Member Since', value: 'Jan 2023', icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ]

  const achievements = [
    { id: 1, title: 'Top Performer', description: 'Highest rated driver this month', icon: Award, earned: true },
    { id: 2, title: 'Mile Master', description: 'Completed 1000+ rides', icon: MapPin, earned: true },
    { id: 3, title: 'Earnings Champion', description: 'Earned $10,000+ this year', icon: DollarSign, earned: true },
    { id: 4, title: 'Perfect Week', description: '5-star rating for 7 days straight', icon: Star, earned: false },
  ]

  return (
    <ProtectedLayout>
      <Container className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <Typography variant="h1" className="text-2xl sm:text-3xl font-bold text-gray-900">
                Account Settings
              </Typography>
              <Typography variant="body1" className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
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
          <Card variant="elevated" className="overflow-hidden">
            <CardBody className="p-0">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-24 sm:h-32"></div>
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 -mt-12 sm:-mt-16">
                <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                      <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                    </div>
                    <button className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors">
                      <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </button>
                  </div>
                  <div className="mt-3 sm:mt-0 flex-1">
                    <Typography variant="h2" className="text-xl sm:text-2xl font-bold text-gray-900">
                      {user?.name || 'John Driver'}
                    </Typography>
                    <Typography variant="body1" className="text-gray-600 mt-1 text-sm sm:text-base">
                      {user?.email || 'john.driver@example.com'}
                    </Typography>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 mr-2" />
                        <div className="flex flex-wrap items-center">
                            {user?.roles.map((role, index) => (
                                <span
                                    key={index}
                                    className="ml-1 text-gray-600/80 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                              {role.trim()}
                            </span>
                            ))}
                        </div>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
                        <span className="text-base sm:text-lg font-semibold text-gray-900 ml-1">4.8</span>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600">(1,247 reviews)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} variant="elevated" className="hover:shadow-lg transition-shadow">
                  <CardBody className="p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <Typography variant="body2" className="text-gray-600 font-medium text-xs sm:text-sm">
                          {stat.label}
                        </Typography>
                        <Typography variant="h2" className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                          {stat.value}
                        </Typography>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor} flex-shrink-0`}>
                        <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Profile Information */}
            <div className="lg:col-span-2">
              <Card variant="elevated">
                <CardHeader className="pb-4">
                  <Typography variant="h3" className="text-lg font-semibold text-gray-900">
                    Profile Information
                  </Typography>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={user?.name || 'John Driver'}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            readOnly
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="email"
                            value={user?.email || 'john.driver@example.com'}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          value="+1 (555) 123-4567"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Driver License</label>
                        <input
                          type="text"
                          value="D123456789"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          readOnly
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea
                        value="123 Main Street, Los Angeles, CA 90210"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        readOnly
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Preferences & Achievements */}
            <div className="space-y-6">
              {/* Preferences */}
              <Card variant="elevated">
                <CardHeader className="pb-4">
                  <Typography variant="h3" className="text-lg font-semibold text-gray-900">
                    Preferences
                  </Typography>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Bell className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <Typography variant="body1" className="font-medium text-gray-900">
                            Email Notifications
                          </Typography>
                          <Typography variant="body2" className="text-gray-600">
                            Get notified about new rides
                          </Typography>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Car className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <Typography variant="body1" className="font-medium text-gray-900">
                            Available for Rides
                          </Typography>
                          <Typography variant="body2" className="text-gray-600">
                            Accept new ride requests
                          </Typography>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Achievements */}
              <Card variant="elevated">
                <CardHeader className="pb-4">
                  <Typography variant="h3" className="text-lg font-semibold text-gray-900">
                    Achievements
                  </Typography>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-4">
                    {achievements.map((achievement) => {
                      const Icon = achievement.icon
                      return (
                        <div key={achievement.id} className={`flex items-center p-3 rounded-lg ${
                          achievement.earned ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                        }`}>
                          <div className={`p-2 rounded-full ${
                            achievement.earned ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              achievement.earned ? 'text-green-600' : 'text-gray-400'
                            }`} />
                          </div>
                          <div className="ml-3 flex-1">
                            <Typography variant="body1" className={`font-medium ${
                              achievement.earned ? 'text-green-900' : 'text-gray-500'
                            }`}>
                              {achievement.title}
                            </Typography>
                            <Typography variant="body2" className={`text-sm ${
                              achievement.earned ? 'text-green-700' : 'text-gray-400'
                            }`}>
                              {achievement.description}
                            </Typography>
                          </div>
                          {achievement.earned ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </ProtectedLayout>
  )
}
