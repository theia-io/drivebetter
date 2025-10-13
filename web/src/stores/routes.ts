import { apiGet } from "@/services/http";

export type RouteResp = { distanceMeters: number; durationSeconds: number; geometry: [number, number][] };

export const getRoute = (from: [number, number], to: [number, number]) =>
  apiGet<RouteResp>("/geo/route", { query: { from: from.join(","), to: to.join(",") } });
