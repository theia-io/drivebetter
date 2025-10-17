import mongoose, {Schema, Document, Model, Types, model} from "mongoose";

export type GroupVisibility = "public" | "private" | "restricted";
export type GroupType = "fleet" | "coop" | "airport" | "city" | "custom";

export interface IGroup extends Document {
    name: string;
    description?: string;
    type: GroupType;
    city?: string;
    location?: string;

    visibility: GroupVisibility;   // controls discoverability
    isInviteOnly: boolean;         // controls who can join
    tags?: string[];               // free-form labels

    members: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        type: { type: String, enum: ["fleet", "coop", "airport", "city", "custom"], required: true, default: "custom" },
        city: { type: String, trim: true },
        location: { type: String, trim: true },

        // NEW
        visibility: { type: String, enum: ["public", "private", "restricted"], required: true, default: "private" },
        isInviteOnly: { type: Boolean, required: true, default: false },
        tags: {
            type: [String],
            set: (arr: unknown) =>
                Array.isArray(arr)
                    ? arr
                        .map((s) => (typeof s === "string" ? s.trim() : ""))
                        .filter(Boolean)
                    : [],
            default: [],
        },

        members: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    },
    { timestamps: true }
);

GroupSchema.index({ name: "text", description: "text", city: "text", location: "text", tags: "text" });
GroupSchema.index({ visibility: 1, isInviteOnly: 1, type: 1, city: 1 });

const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);
export default Group;
