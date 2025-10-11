"use client";
import {MapContainer, Marker, Popup, TileLayer} from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'

import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
    iconRetinaUrl: (marker2x as unknown as { src: string }).src ?? (marker2x as unknown as string),
    iconUrl: (marker as unknown as { src: string }).src ?? (marker as unknown as string),
    shadowUrl: (shadow as unknown as { src: string }).src ?? (shadow as unknown as string),
});

export type Pt = [number, number]; // [lon,lat]

export default function MapInner({
                                     center = [4.8922, 52.3731] as [number, number], // lon,lat
                                     zoom = 12,
                                     heightClass = "h-64",
                                     marker,
                                     markerLabel,
                                     children,
                                 }: {
    center?: Pt;
    zoom?: number;
    heightClass?: string;
    marker?: Pt | null;
    markerLabel?: string;
    children?: React.ReactNode;
}) {
    return (
        <MapContainer center={[center[1], center[0]]} zoom={zoom} className={`${heightClass} w-full rounded-xl border`}>
            <TileLayer url={`http://localhost:3000/api/v1/geo/tiles/{z}/{x}/{y}`}
                       attribution='&copy; MapTiler &copy; OpenStreetMap contributors'/>
            {marker && (
                <Marker position={[marker[1], marker[0]]}>
                    {markerLabel ? <Popup>{markerLabel}</Popup> : null}
                </Marker>
            )}
            {children}
        </MapContainer>
    );
}
