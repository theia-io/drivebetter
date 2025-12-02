import { Types } from "mongoose";

export function isObjectId(v: any): boolean {
    return v instanceof Types.ObjectId;
}

export function normalizeId(id: any): Types.ObjectId {
    if (!id) {
        throw new Error("normalizeId: id is required");
    }

    if (isObjectId(id)) {
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

export function compareIds(id1: any, id2: any): boolean {
    const id1Normalized = normalizeId(id1);
    const id2Normalized = normalizeId(id2);
    if (!id1Normalized || !id2Normalized) {
        return false;
    }
    return id1Normalized.equals(id2Normalized);
}
