import { Types } from "mongoose";

export function normalizeId(id: any): Types.ObjectId {
    if (!id) {
        throw new Error("normalizeId: id is required");
    }

    if (id instanceof Types.ObjectId) {
        return id;
    }

    if (typeof id === "string") {
        return new Types.ObjectId(id);
    }

    if (typeof id === "object" && (id as any)._id) {
        return normalizeId((id as any)._id);
    }

    throw new Error(`normalizeId: unsupported id value: ${JSON.stringify(id)}`);
}
