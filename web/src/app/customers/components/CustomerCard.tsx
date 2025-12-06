import {MyCustomer, useCustomerRides} from "@/stores/customers";
import {CalendarClock, Car, Clock, Mail, Phone} from "lucide-react";
import Link from "next/link";
import {Button} from "@/components/ui";

export default function CustomerCard({
                          customer,
                          reloadCustomers,
                          reloadInvites,
                      }: {
    customer: MyCustomer;
    reloadCustomers: () => Promise<any>;
    reloadInvites: () => Promise<any>;
}) {
    const u: any = customer.user;
    const p = customer.profile;
    const s = customer.stats;

    const registeredAt = u?.createdAt ? new Date(u.createdAt) : null;
    const lastRideAt = s?.lastRideAt ? new Date(s.lastRideAt) : null;

    const customerUserId = u?._id || p?.userId;

    // Pull total rides from /customers/:id/rides if stats missing
    const { total: ridesTotalFromApi } = useCustomerRides(customerUserId, {
        enabled: !!customerUserId,
        page: 1,
        limit: 1,
    });

    const ridesTotal =
        typeof s?.ridesTotal === "number" ? s.ridesTotal : ridesTotalFromApi ?? 0;

    return (
        <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                    <h2 className="truncate text-sm font-semibold text-gray-900">
                        {u?.name || "Unregistered customer"}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
                        {u?.email && (
                            <span className="inline-flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                <span className="truncate">{u.email}</span>
                            </span>
                        )}
                        {u?.phone && (
                            <span className="inline-flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                <span className="truncate">{u.phone}</span>
                            </span>
                        )}
                    </div>
                </div>

                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        u
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                >
                    {u ? "Registered" : "Invited"}
                </span>
            </div>

            {/* Stats for this customer */}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                <div className="space-y-0.5">
                    <dt className="uppercase tracking-wide text-gray-500">Age</dt>
                    <dd className="text-sm font-medium text-gray-900">
                        {typeof p?.age === "number" ? p.age : "—"}
                    </dd>
                </div>
                <div className="space-y-0.5">
                    <dt className="uppercase tracking-wide text-gray-500">Rides</dt>
                    <dd className="flex items-center gap-1 text-sm font-medium text-gray-900">
                        <Car className="h-3.5 w-3.5 text-gray-400" />
                        {ridesTotal}
                    </dd>
                </div>
                <div className="space-y-0.5">
                    <dt className="uppercase tracking-wide text-gray-500">
                        Registered
                    </dt>
                    <dd className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[11px]">
                            {registeredAt
                                ? registeredAt.toLocaleDateString()
                                : "—"}
                        </span>
                    </dd>
                </div>
                <div className="space-y-0.5">
                    <dt className="uppercase tracking-wide text-gray-500">
                        Last ride
                    </dt>
                    <dd className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[11px]">
                            {lastRideAt
                                ? lastRideAt.toLocaleDateString()
                                : "—"}
                        </span>
                    </dd>
                </div>
            </dl>

            {/* Actions */}
            <div className="mt-4 flex flex-col gap-2 text-xs sm:text-sm">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                        href={`/rides/new?customerId=${encodeURIComponent(
                            u?._id || "",
                        )}`}
                        className="sm:flex-1"
                    >
                        <Button
                            type="button"
                            colorScheme="success"
                            className="inline-flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                            disabled={!u}
                        >
                            <Car className="mr-1.5 h-4 w-4" />
                            Create ride
                        </Button>
                    </Link>
                    <Link
                        href={`/rides?customerId=${encodeURIComponent(
                            u?._id || "",
                        )}`}
                        className="sm:flex-1"
                    >
                        <button
                            type="button"
                            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Ride history
                        </button>
                    </Link>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                        href={`/customers/${encodeURIComponent(u?._id || "")}`}
                        className="sm:flex-1"
                    >
                        <button
                            type="button"
                            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            View details
                        </button>
                    </Link>
                    <button
                        type="button"
                        onClick={() =>
                            Promise.all([reloadCustomers(), reloadInvites()])
                        }
                        className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:flex-none sm:w-auto"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        </article>
    );
}
