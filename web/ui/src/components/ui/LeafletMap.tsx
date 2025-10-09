"use client";
import { TileLayer } from "react-leaflet";
import { MapContainer } from 'react-leaflet'

export default function LeafletMap({
                                       center = [52.3731, 4.8922],
                                       zoom = 12,
                                       heightClass = "h-64",
                                       children,
                                   }: {
    center?: [number, number];
    zoom?: number;
    heightClass?: string;
    children?: React.ReactNode;
}) {
    return (
        <MapContainer center={center} zoom={zoom} className={`${heightClass} w-full rounded-xl border`}>
            <TileLayer
                url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=3aYiri1hHeXlcrWgDr1A"}`}
                attribution='&copy; MapTiler &copy; OpenStreetMap contributors'
            />
            {children}
        </MapContainer>
    );
}
