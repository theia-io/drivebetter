import { Card, CardBody, CardHeader, Typography } from "@/components/ui";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function Achievements({achievements}: {achievements: any[]}) {
    return (
        <Card variant="elevated">
            <CardHeader className="pb-4">
                <Typography variant="h3" className="text-lg font-semibold text-gray-900">
                    Achievements
                </Typography>
            </CardHeader>
            <CardBody className="pt-0">
                <div className="space-y-4">
                    {achievements.map((achievement) => {
                        const Icon = achievement.icon;
                        return (
                            <div
                                key={achievement.id}
                                className={`flex items-center p-3 rounded-lg ${
                                    achievement.earned
                                        ? "bg-green-50 border border-green-200"
                                        : "bg-gray-50 border border-gray-200"
                                }`}
                            >
                                <div
                                    className={`p-2 rounded-full ${
                                        achievement.earned ? "bg-green-100" : "bg-gray-100"
                                    }`}
                                >
                                    <Icon
                                        className={`w-5 h-5 ${
                                            achievement.earned ? "text-green-600" : "text-gray-400"
                                        }`}
                                    />
                                </div>
                                <div className="ml-3 flex-1">
                                    <Typography
                                        variant="body1"
                                        className={`font-medium ${
                                            achievement.earned ? "text-green-900" : "text-gray-500"
                                        }`}
                                    >
                                        {achievement.title}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        className={`text-sm ${
                                            achievement.earned ? "text-green-700" : "text-gray-400"
                                        }`}
                                    >
                                        {achievement.description}
                                    </Typography>
                                </div>
                                {achievement.earned ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-gray-400" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardBody>
        </Card>
    );
}
