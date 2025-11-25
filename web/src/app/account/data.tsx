import { Award, Calendar, Car, DollarSign, MapPin, Star } from "lucide-react";

export const STATS = [
    {
        label: "Total Rides",
        value: "1,247",
        icon: Car,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
    },
    {
        label: "Average Rating",
        value: "4.8",
        icon: Star,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
    },
    {
        label: "Total Earnings",
        value: "$15,420",
        icon: DollarSign,
        color: "text-green-600",
        bgColor: "bg-green-50",
    },
    {
        label: "Member Since",
        value: "Jan 2023",
        icon: Calendar,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
    },
];

export const ACHIEVEMENTS = [
    {
        id: 1,
        title: "Top Performer",
        description: "Highest rated driver this month",
        icon: Award,
        earned: true,
    },
    {
        id: 2,
        title: "Mile Master",
        description: "Completed 1000+ rides",
        icon: MapPin,
        earned: true,
    },
    {
        id: 3,
        title: "Earnings Champion",
        description: "Earned $10,000+ this year",
        icon: DollarSign,
        earned: true,
    },
    {
        id: 4,
        title: "Perfect Week",
        description: "5-star rating for 7 days straight",
        icon: Star,
        earned: false,
    },
];
