"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

export const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

L.Icon.Default.mergeOptions({
    iconRetinaUrl: (marker2x as any).src ?? (marker2x as any),
    iconUrl: (marker as any).src ?? (marker as any),
    shadowUrl: (shadow as any).src ?? (shadow as any),
});

export type Pt = [number, number]; // [lon,lat]

function AutoView({
                      a,
                      b,
                      line,
                      fallback,
                  }: {
    a?: Pt | null;
    b?: Pt | null;
    line?: Pt[];
    fallback: Pt; // lon,lat
}) {
    const map = useMap();
    useEffect(() => {
        const pts: [number, number][] = [];
        if (a) pts.push([a[1], a[0]]);
        if (b) pts.push([b[1], b[0]]);
        if (line && line.length > 0) pts.push(...line.map(([lon, lat]) => [lat, lon] as [number, number]));

        if (pts.length >= 2) {
            // @ts-ignore
            map.fitBounds(pts, { padding: [24, 24] });
        } else if (a || b) {
            const p = a ?? b!;
            map.setView([p[1], p[0]], Math.max(map.getZoom(), 14));
        } else {
            const [lon, lat] = fallback;
            map.setView([lat, lon], 12);
        }
    }, [a, b, line, fallback, map]);
    return null;
}

export default function MapInner({
                                     center = [4.8922, 52.3731] as Pt, // lon,lat fallback
                                     zoom = 12,
                                     heightClass = "h-64",
                                     markerA,
                                     markerB,
                                     routeLine = [],
                                     markerALabel,
                                     markerBLabel,
                                     children,
                                 }: {
    center?: Pt;
    zoom?: number;
    heightClass?: string;
    markerA?: Pt | null;
    markerB?: Pt | null;
    routeLine?: Pt[];
    markerALabel?: string;
    markerBLabel?: string;
    children?: React.ReactNode;
}) {
    // MapContainer needs a non-null center; we always provide fallback
    const [clon, clat] = center;
    const tilesUrl = `${API_BASE}/geo/tiles/{z}/{x}/{y}`;
    console.log(tilesUrl);
    return (
        <MapContainer center={[clat, clon]} zoom={zoom} className={`${heightClass} w-full rounded-xl border`}>
            <TileLayer
                url={tilesUrl}
                attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
            />

            <AutoView a={markerA ?? null} b={markerB ?? null} line={routeLine} fallback={center} />

            {markerA && (
                <Marker position={[markerA[1], markerA[0]]}>
                    {markerALabel ? <div>{markerALabel}</div> : null}
                </Marker>
            )}
            {markerB && (
                <Marker position={[markerB[1], markerB[0]]}>
                    {markerBLabel ? <div>{markerBLabel}</div> : null}
                </Marker>
            )}
            {routeLine.length > 0 && <Polyline positions={routeLine.map(([x, y]) => [y, x])} />}

            {children}
        </MapContainer>
    );
}
