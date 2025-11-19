// web/ui/src/services/geocode.ts
import { apiGet } from "@/services/http";
export type PlaceHit = { label: string; lat: number; lon: number };
export const searchPlaces = (q: string) => apiGet<PlaceHit[]>("/geo/search", { query: { q } });
