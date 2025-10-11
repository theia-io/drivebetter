// web/ui/src/components/maps/RouteLayer.tsx
"use client";
import { Marker, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";

export default function RouteLayer({
                                       a, b, line,
                                   }: {
    a: [number, number] | null; // [lon,lat]
    b: [number, number] | null;
    line: [number, number][];
}) {
    const map = useMap();
    useEffect(() => {
        const pts = [
            ...(a ? [[a[1], a[0]]] : []),
            ...(b ? [[b[1], b[0]]] : []),
            ...line.map(([lon, lat]) => [lat, lon] as [number, number]),
        ];
        if (pts.length >= 2) {
            // @ts-ignore
            map.fitBounds(pts, { padding: [24, 24] });
        }
    }, [a, b, line, map]);

    return (
        <>
            {a && <Marker position={[a[1], a[0]]} />}
            {b && <Marker position={[b[1], b[0]]} />}
            {line.length > 0 && <Polyline positions={line.map(([lon, lat]) => [lat, lon])} />}
        </>
    );
}
