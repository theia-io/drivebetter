// models/groupInvite.model.ts
import mongoose, { Schema, Types, Model, Document } from "mongoose";

export interface IGroupInvite extends Document {
    groupId: Types.ObjectId;
    code: string;
    createdBy: Types.ObjectId;
    usedBy?: Types.ObjectId | null;
    usedAt?: Date | null;
    expiresAt?: Date | null;
}

const GroupInviteSchema = new Schema<IGroupInvite>(
    {
        groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
        code: { type: String, required: true, unique: true, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        usedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        usedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
    },
    { timestamps: true }
);

GroupInviteSchema.index({ groupId: 1, code: 1 }, { unique: true });

export const GroupInvite: Model<IGroupInvite> =
    mongoose.models.GroupInvite || mongoose.model<IGroupInvite>("GroupInvite", GroupInviteSchema);
