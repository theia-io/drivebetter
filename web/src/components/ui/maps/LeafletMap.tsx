"use client";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./MapInner"), { 
    ssr: false,
    loading: () => <div className="h-64 w-full rounded-xl border bg-gray-100 animate-pulse" />
});

export default LeafletMap;
