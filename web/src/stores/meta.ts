"use client";

import useSWR from "swr";
import { apiGet } from "@/services/http";

type ApiVersion = {
    name: string;
    version: string;
    commit: string;
    buildTime?: string | null;
};

export function useApiVersion() {
    return useSWR<ApiVersion>("/version", () => apiGet<ApiVersion>("/version"), {
        revalidateOnFocus: false,
        revalidateIfStale: false,
        revalidateOnReconnect: false,
    });
}
