"use client";
import { Marker, useMap } from "react-leaflet";
import { useEffect } from "react";

export default function PointLayer({ coord }: { coord: [number, number] | null /* [lon,lat] */ }) {
    const map = useMap();
    useEffect(() => {
        if (!coord) return;
        // @ts-ignore
        map.setView([coord[1], coord[0]], Math.max(map.getZoom(), 14), { animate: true });
    }, [coord, map]);

    if (!coord) return null;
    return <Marker position={[coord[1], coord[0]]} />;
}
