export const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        // try to parse error body
        let details: any = {};
        try {
            details = await res.json();
        } catch {}
        const msg = details?.error || res.statusText || "Request failed";
        throw new Error(msg);
    }

    // handle empty body
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
}
