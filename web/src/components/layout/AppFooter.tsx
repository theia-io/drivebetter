"use client";

import { useApiVersion } from "@/stores/meta";

const WEB_VERSION = process.env.NEXT_PUBLIC_WEB_VERSION || "0.0.0-dev";
const WEB_COMMIT = process.env.NEXT_PUBLIC_WEB_COMMIT || "dev";

export default function AppFooter() {
    const { data: apiVersion } = useApiVersion();

    return (
        <footer className="mt-6 border-t border-gray-200 py-2 px-3 text-[11px] text-gray-500 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
        <span>
          Web v{WEB_VERSION}
            {WEB_COMMIT !== "dev" && (
                <span className="ml-1 text-gray-400">({WEB_COMMIT})</span>
            )}
        </span>

                {apiVersion && (
                    <span className="ml-3">
            API v{apiVersion.version}
                        {apiVersion.commit && (
                            <span className="ml-1 text-gray-400">
                ({apiVersion.commit})
              </span>
                        )}
          </span>
                )}
            </div>

            {apiVersion?.buildTime && (
                <span className="hidden sm:inline text-gray-400">
          Built: {new Date(apiVersion.buildTime).toLocaleString()}
        </span>
            )}
        </footer>
    );
}
