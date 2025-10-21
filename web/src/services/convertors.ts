export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
export const money = (cents?: number) => (typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "—");
export const km = (m?: number) => (m ? `${(m / 1000).toFixed(1)} km` : "—");
export const mins = (m?: number) => (m ? `${m} min` : "—");