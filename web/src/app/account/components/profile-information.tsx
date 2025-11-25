import { Card, CardBody, CardHeader, Typography } from "@/components/ui";
import { Mail, Phone, User } from "lucide-react";
import { User as UserType } from "@/types/user";

export default function ProfileInformation({ user }: { user: UserType }) {
    return (
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={user?.name || "N/A"}
                                        className="bg-gray-100  w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        readOnly
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="email"
                                        value={user?.email || "N/A"}
                                        className="bg-gray-100 w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>

                        {user?.phone && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="tel"
                                            value={user?.phone || "N/A"}
                                            className="bg-gray-100 w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
