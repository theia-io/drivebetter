import { Button, Card, CardBody, Typography } from "@/components/ui";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewRideHeader() {
    const router = useRouter();

    const [showInfo, setShowInfo] = useState(false);

    return (
        <>
            <div className="flex flex-col lg:flex-row lg:items-center mb-4 sm:mb-6 justify-between">
                <div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                        onClick={() => router.back()}
                        className="mr-1 sm:mr-3"
                    >
                        Back
                    </Button>
                </div>

                <div className="min-w-0">
                    <Typography variant="h1" className="text-lg sm:text-3xl font-bold">
                        New ride
                    </Typography>
                    <Typography
                        variant="body1"
                        className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1"
                    >
                        Stage 1 · Create the ride, assign or share afterwards
                    </Typography>
                </div>
                <div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="xl:hidden"
                        aria-expanded={showInfo}
                        aria-controls="mobile-help-panel"
                        onClick={() => setShowInfo((v) => !v)}
                    >
                        <HelpCircle className="w-4 h-4 mr-1" />
                        {showInfo ? "Hide help" : "How it works"}
                    </Button>
                </div>
            </div>

            {showInfo && (
                <aside id="mobile-help-panel" className="xl:hidden mb-4 sm:mb-6">
                    <Card variant="elevated">
                        <CardBody className="p-3 sm:p-4 space-y-2">
                            <Typography className="text-sm font-semibold text-gray-900">
                                How ride creation works
                            </Typography>
                            <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm text-gray-700">
                                <li>
                                    Create an <span className="font-medium">unassigned</span> ride.
                                </li>
                                <li>
                                    Then <span className="font-medium">assign a driver</span> or{" "}
                                    <span className="font-medium">create a share</span> for
                                    drivers/groups.
                                </li>
                                <li>
                                    Drivers can <span className="font-medium">request</span> the
                                    ride; you <span className="font-medium">approve</span> one.
                                </li>
                                <li>
                                    Approving assigns the ride and{" "}
                                    <span className="font-medium">disables</span> other shares.
                                </li>
                            </ol>
                        </CardBody>
                    </Card>
                </aside>
            )}
        </>
    );
}
