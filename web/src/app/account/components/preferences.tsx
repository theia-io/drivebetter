"use client";

import { Card, CardBody, CardHeader, Typography } from "@/components/ui";
import { Switch } from "@/components/ui/switch";
import { usePWA } from "@/services/pwa";
import { useAuthStore } from "@/stores";
import { Bell, Car } from "lucide-react";
import PushNotificationsSwitch from "../../../components/notifications/push-notifications";

export default function Preferences() {
    const { isStandalone } = usePWA();
    const { user } = useAuthStore();

    const subscriptions = user?.subscriptions?.sort(
        (a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
    );

    return (
        <Card variant="elevated">
            <CardHeader className="pb-4">
                <Typography variant="h3" className="text-lg font-semibold text-gray-900">
                    Preferences
                </Typography>
            </CardHeader>
            <CardBody className="pt-0">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Bell className="inline-block w-5 h-5 text-gray-400 mr-3" />

                                <Typography variant="body1" className="font-medium text-gray-900">
                                    Push Notifications
                                </Typography>
                            </div>
                            <Typography variant="body2" className="text-gray-600">
                                {isStandalone
                                    ? "Receive push notifications for new rides and updates"
                                    : "We support push-notifications for installed applications only"}
                            </Typography>
                        </div>

                        {isStandalone && <PushNotificationsSwitch className="ml-auto" />}
                    </div>

                    {subscriptions.length > 0 && (
                        <div>
                            <Typography variant="body1" className="font-medium text-gray-900">
                                {subscriptions.length} device{subscriptions.length > 1 ? "s" : ""}{" "}
                                subscribed
                            </Typography>
                            {subscriptions
                                .filter((subscription) => !!subscription.deviceName)
                                .map((subscription, index) => (
                                    <div key={subscription.endpoint + index}>
                                        <Typography variant="body2" className="text-gray-600">
                                            <div>{subscription.deviceName}</div>
                                            {!!subscription.subscribedAt && (
                                                <div>
                                                    {" "}
                                                    <span className="text-gray-500">
                                                        Subscribed at:{" "}
                                                    </span>
                                                    {new Date(
                                                        subscription.subscribedAt
                                                    ).toLocaleString()}
                                                </div>
                                            )}
                                        </Typography>
                                    </div>
                                ))}
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Bell className="inline-block w-5 h-5 text-gray-400 mr-3" />

                                <Typography variant="body1" className="font-medium text-gray-900">
                                    Email Notifications
                                </Typography>
                            </div>
                            <Typography variant="body2" className="text-gray-600">
                                Get notified about new rides
                            </Typography>
                        </div>

                        <Switch
                            className="ml-auto"
                            checked={false}
                            onCheckedChange={(checked) => {
                                console.log("email notifications checked", checked);
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Car className="inline-block w-5 h-5 text-gray-400 mr-3" />

                                <Typography variant="body1" className="font-medium text-gray-900">
                                    Available for Rides
                                </Typography>
                            </div>
                            <Typography variant="body2" className="text-gray-600">
                                Accept new ride requests
                            </Typography>
                        </div>

                        <Switch
                            className="ml-auto"
                            checked={false}
                            onCheckedChange={(checked) => {
                                console.log("available for rides checked", checked);
                            }}
                        />
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
