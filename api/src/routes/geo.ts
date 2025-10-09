import { Router, Request, Response } from "express";

const router = Router();
const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY;
if (!MAPTILER_API_KEY) {
    // Fail fast on boot if desired, or keep runtime guard below
    throw new Error("Missing MAPTILER_API_KEY");
}

function bad(res: Response, status: number, error: string) {
    return res.status(status).json({ error });
}
/**
 * @openapi
 * /geo/search:
 *   get:
 *     summary: Place search / autocomplete
 *     description: Proxies MapTiler Geocoding and normalizes results.
 *     tags: [Geo]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         description: Free-text query (minimum 2 chars)
 *         schema:
 *           type: string
 *           minLength: 2
 *           example: Amsterdam
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 8
 *       - in: query
 *         name: country
 *         required: false
 *         description: ISO 3166-1 alpha-2 country filter
 *         schema:
 *           type: string
 *           example: NL
 *       - in: query
 *         name: language
 *         required: false
 *         description: IETF language tag for results
 *         schema:
 *           type: string
 *           example: en
 *     responses:
 *       200:
 *         description: List of candidate places
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GeoPlace'
 *       500:
 *         description: Proxy or provider error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GeoError'
 */
router.get("/search", async (req: Request, res: Response) => {
    try {
        const q = String(req.query.q || "").trim();
        if (!MAPTILER_API_KEY) return bad(res, 500, "maptiler_key_missing");
        if (!q || q.length < 2) return res.json([]);

        const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json`);
        url.searchParams.set("key", MAPTILER_API_KEY);
        url.searchParams.set("autocomplete", "true");
        url.searchParams.set("limit", String(req.query.limit || 8));
        if (req.query.country) url.searchParams.set("country", String(req.query.country)); // optional filter
        if (req.query.language) url.searchParams.set("language", String(req.query.language)); // optional locale

        const r = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!r.ok) return bad(res, 502, "geocode_upstream_failed");

        const data = await r.json();
        const features: any[] = Array.isArray(data?.features) ? data.features : [];
        const hits = features
            .map((f) => {
                const c = f?.center || f?.geometry?.coordinates;
                const label =
                    f?.place_name ||
                    f?.place_name_en ||
                    f?.text ||
                    f?.properties?.name ||
                    f?.properties?.label ||
                    "";
                const lon = Number(c?.[0]);
                const lat = Number(c?.[1]);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                return { label, lat, lon };
            })
            .filter(Boolean);

        return res.json(hits);
    } catch (err: any) {
        return bad(res, 500, "geocode_proxy_error");
    }
});


/**
 * @openapi
 * /geo/route:
 *   get:
 *     summary: Point-to-point route
 *     description: Proxies MapTiler Directions and returns a normalized route.
 *     tags: [Geo]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         description: Origin as "lon,lat"
 *         schema:
 *           type: string
 *           pattern: '^-?\\d+(\\.\\d+)?,\\s*-?\\d+(\\.\\d+)?$'
 *           example: "4.8922,52.3731"
 *       - in: query
 *         name: to
 *         required: true
 *         description: Destination as "lon,lat"
 *         schema:
 *           type: string
 *           pattern: '^-?\\d+(\\.\\d+)?,\\s*-?\\d+(\\.\\d+)?$'
 *           example: "4.8994,52.3791"
 *       - in: query
 *         name: profile
 *         required: false
 *         description: Routing profile
 *         schema:
 *           type: string
 *           enum: [driving, cycling, foot]
 *           default: driving
 *       - in: query
 *         name: alternatives
 *         required: false
 *         description: Request alternative routes if supported
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: avoid
 *         required: false
 *         description: Avoid features (e.g., toll, ferry)
 *         schema:
 *           type: string
 *       - in: query
 *         name: language
 *         required: false
 *         description: IETF language tag
 *         schema:
 *           type: string
 *           example: en
 *       - in: query
 *         name: units
 *         required: false
 *         description: Distance units for provider response (normalized here to meters anyway)
 *         schema:
 *           type: string
 *           enum: [m, km, mi]
 *     responses:
 *       200:
 *         description: Route summary and geometry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GeoRoute'
 *       400:
 *         description: Bad coordinates or missing params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GeoError'
 *       502:
 *         description: Upstream provider error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GeoError'
 *       500:
 *         description: Proxy error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GeoError'
 */
router.get("/route", async (req: Request, res: Response) => {
    try {
        if (!MAPTILER_API_KEY) return bad(res, 500, "maptiler_key_missing");

        const from = String(req.query.from || req.query.a || "").trim(); // support both
        const to = String(req.query.to || req.query.b || "").trim();
        const profile = String(req.query.profile || "driving");

        if (!from || !to) return bad(res, 400, "missing_coords");
        const [flon, flat] = from.split(",").map(Number);
        const [tlon, tlat] = to.split(",").map(Number);
        if (![flon, flat, tlon, tlat].every(Number.isFinite)) return bad(res, 400, "bad_coords");

        // MapTiler Directions (GeoJSON)
        // https://api.maptiler.com/directions/{profile}/geojson?key=...&coordinates=lon,lat;lon,lat
        const url = new URL(`https://api.maptiler.com/directions/${encodeURIComponent(profile)}/geojson`);
        url.searchParams.set("key", MAPTILER_API_KEY);
        url.searchParams.set("coordinates", `${flon},${flat};${tlon},${tlat}`);
        // Optional params:
        if (req.query.alternatives) url.searchParams.set("alternatives", String(req.query.alternatives));
        if (req.query.avoid) url.searchParams.set("avoid", String(req.query.avoid)); // e.g., toll, ferry
        if (req.query.language) url.searchParams.set("language", String(req.query.language));
        if (req.query.units) url.searchParams.set("units", String(req.query.units)); // m|km|mi

        const r = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!r.ok) return bad(res, 502, "route_upstream_failed");

        const data = await r.json();

        // MapTiler may return either a GeoJSON FeatureCollection or a structure with routes[]
        // Handle both defensively.

        // Case A: routes[] like Mapbox
        const routeA = Array.isArray((data as any)?.routes) ? (data as any).routes[0] : null;

        // Case B: GeoJSON FeatureCollection
        const feat0 =
            Array.isArray((data as any)?.features) && (data as any).features.length > 0
                ? (data as any).features[0]
                : null;

        let distanceMeters = 0;
        let durationSeconds = 0;
        let line: [number, number][] = [];

        if (routeA) {
            distanceMeters = Math.round(routeA.distance ?? 0);
            durationSeconds = Math.round(routeA.duration ?? 0);
            if (routeA.geometry?.coordinates) line = routeA.geometry.coordinates as [number, number][];
        } else if (feat0) {
            const props = feat0.properties || {};
            // Some variants use summary, some use distance/duration top-level
            distanceMeters = Math.round(props.summary?.distance ?? props.distance ?? 0);
            durationSeconds = Math.round(props.summary?.duration ?? props.duration ?? 0);
            if (Array.isArray(feat0.geometry?.coordinates)) {
                line = feat0.geometry.coordinates as [number, number][];
            }
        }

        return res.json({
            distanceMeters,
            durationSeconds,
            geometry: line,
        });
    } catch (err: any) {
        return bad(res, 500, "route_proxy_error");
    }
});

export default router;
