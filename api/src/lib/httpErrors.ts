// utils/httpErrors.ts
import { Error as MongooseError } from "mongoose";

export function normalizeValidationError(err: any) {
    if (err instanceof MongooseError.ValidationError) {
        const fieldErrors: Record<string, string> = {};
        for (const [path, e] of Object.entries(err.errors)) {
            fieldErrors[path] = (e as any).message || "Invalid value";
        }
        return {
            status: 422,
            body: {
                error: "ValidationFailed",
                message: "One or more fields are invalid",
                fieldErrors, // e.g. { "capacity.maxPassengers": "Path ... minimum allowed value (1)" }
            },
        };
    }
    return null;
}
