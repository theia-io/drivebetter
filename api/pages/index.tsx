import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Lazy-load SwaggerUI React to avoid SSR issues
const SwaggerUI = dynamic<{
    url: string;
}>(() => import("swagger-ui-react"), { ssr: false });

export default function Home() {
    return (
        <div style={{ height: "100vh" }}>
            <SwaggerUI url="/api/openapi.json" />
        </div>
    );
}
