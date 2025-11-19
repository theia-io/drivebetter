import { Request, Response, Router } from "express";

const router = Router();
const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY!;
const STYLE = process.env.MAPTILER_RASTER_STYLE || "streets";
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

        const r = await fetch(url.toString(), {
            headers: { Accept: "application/json", Origin: "localhost" },
        });
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
 *     description: Proxies OpenRouteService Directions and returns a normalized route.
 *     tags: [Geo]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         description: Origin as "lon,lat"
 *         schema:
 *           type: string
 *           example: "4.8922,52.3731"
 *       - in: query
 *         name: to
 *         required: true
 *         description: Destination as "lon,lat"
 *         schema:
 *           type: string
 *           example: "4.8994,52.3791"
 *       - in: query
 *         name: profile
 *         required: false
 *         description: Routing profile (mapped to ORS profiles)
 *         schema:
 *           type: string
 *           enum: [driving, cycling, foot]
 *           default: driving
 *       - in: query
 *         name: avoid
 *         required: false
 *         description: Comma-separated avoid features; supports toll,ferry,unpaved,motorway,tunnel,ford
 *         schema:
 *           type: string
 *           example: toll,ferry
 *       - in: query
 *         name: alternatives
 *         required: false
 *         description: Number of alternative routes to request (0-3). Only the first is returned here.
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 3
 *           default: 0
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
        const ORS_API_KEY = process.env.ORS_API_KEY;
        if (!ORS_API_KEY) return bad(res, 500, "ors_key_missing");

        const from = String(req.query.from || req.query.a || "").trim();
        const to = String(req.query.to || req.query.b || "").trim();
        const profileIn = String(req.query.profile || "driving");

        if (!from || !to) return bad(res, 400, "missing_coords");
        const [flon, flat] = from.split(",").map(Number);
        const [tlon, tlat] = to.split(",").map(Number);
        if (![flon, flat, tlon, tlat].every(Number.isFinite)) return bad(res, 400, "bad_coords");

        // map generic profiles to ORS
        const profile =
            profileIn === "cycling"
                ? "cycling-regular"
                : profileIn === "foot"
                  ? "foot-walking"
                  : "driving-car";

        // avoid features mapping
        const avoidParam = String(req.query.avoid || "").trim();
        const avoidList = avoidParam
            ? avoidParam
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
            : [];
        // ORS avoid_features keywords
        const orsAvoidAllowed = new Set([
            "highways",
            "tollways",
            "ferries",
            "fords",
            "steps",
            "unpavedroads",
            "tunnels",
            "tracks",
        ]);
        const normalizedAvoid = avoidList
            .map((a) => {
                if (a === "toll") return "tollways";
                if (a === "motorway" || a === "highway") return "highways";
                if (a === "unpaved") return "unpavedroads";
                if (a === "ferry") return "ferries";
                return a;
            })
            .filter((a) => orsAvoidAllowed.has(a));

        const altCount = Math.max(0, Math.min(3, Number(req.query.alternatives ?? 0)));

        const body: any = {
            coordinates: [
                [flon, flat],
                [tlon, tlat],
            ],
            units: "m",
        };

        if (normalizedAvoid.length > 0) {
            body.options = { ...(body.options || {}), avoid_features: normalizedAvoid };
        }
        if (altCount > 0) {
            body.alternative_routes = {
                target_count: altCount,
                share_factor: 0.6,
                weight_factor: 1.4,
            };
        }

        const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

        const r = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: ORS_API_KEY,
                "Content-Type": "application/json; charset=utf-8",
                Accept: "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
            },
            body: JSON.stringify(body),
        });

        if (!r.ok) return bad(res, 502, "route_upstream_failed");

        const data = await r.json();
        const feat0 =
            Array.isArray(data?.features) && data.features.length > 0 ? data.features[0] : null;

        let distanceMeters = 0;
        let durationSeconds = 0;
        let line: [number, number][] = [];

        if (feat0) {
            const props = feat0.properties || {};
            const summary = props.summary || {};
            distanceMeters = Math.round(summary.distance ?? props.distance ?? 0);
            durationSeconds = Math.round(summary.duration ?? props.duration ?? 0);
            if (Array.isArray(feat0.geometry?.coordinates)) {
                line = feat0.geometry.coordinates as [number, number][];
            }
        }

        return res.json({
            distanceMeters,
            durationSeconds,
            geometry: line,
        });
    } catch {
        return bad(res, 500, "route_proxy_error");
    }
});

/**
 * @openapi
 * /geo/tiles/{z}/{x}/{y}.png:
 *   get:
 *     summary: Retrieve a raster map tile from MapTiler proxy
 *     description: >
 *       Returns a PNG raster tile proxied from the MapTiler API for the given
 *       tile coordinates (`z`, `x`, `y`).
 *       This endpoint hides the MapTiler API key from clients and adds caching headers.
 *     tags: [Geo]
 *     parameters:
 *       - in: path
 *         name: z
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Zoom level of the requested tile
 *       - in: path
 *         name: x
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: X coordinate of the tile
 *       - in: path
 *         name: y
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Y coordinate of the tile
 *     responses:
 *       200:
 *         description: PNG raster map tile
 *         content:
 *           image/png: {}
 *       502:
 *         description: Upstream MapTiler service error or fetch failure
 */
router.get("/tiles/:z/:x/:y", async (req, res) => {
    if (!MAPTILER_API_KEY) return bad(res, 500, "maptiler_key_missing");
    const { z, x, y } = req.params;
    const upstream = `https://api.maptiler.com/maps/streets/${z}/${x}/${y}.png?key=${MAPTILER_API_KEY}`;

    const r = await fetch(upstream, { headers: { Accept: "image/png", Origin: "localhost" } });
    if (!r.ok) return res.status(502).end();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    const buf = Buffer.from(await r.arrayBuffer());
    res.end(buf);
});

export default router;
