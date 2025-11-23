import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type GroupVisibility = "public" | "private" | "restricted";
export type GroupType = "fleet" | "coop" | "airport" | "city" | "custom" | "global";

export interface IGroup extends Document {
    name: string;
    description?: string;
    type: GroupType;
    city?: string;
    location?: string;

    visibility: GroupVisibility;    // discoverability
    isInviteOnly: boolean;          // join policy
    tags?: string[];                // free-form labels

    ownerId: Types.ObjectId;        // creator / owner of the group
    moderators: Types.ObjectId[];   // can manage group, approve stuff
    participants: Types.ObjectId[]; // normal members

    // denormalised union of all members = owner + moderators + participants
    members: Types.ObjectId[];

    // group rules text to show in UI, forum-style
    rules?: string;

    createdAt: Date;
    updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        type: {
            type: String,
            enum: ["fleet", "coop", "airport", "city", "custom", "global"],
            default: "custom",
            required: true,
        },
        city: { type: String, trim: true },
        location: { type: String, trim: true },

        visibility: {
            type: String,
            enum: ["public", "private", "restricted"],
            default: "private",
            required: true,
        },
        isInviteOnly: {
            type: Boolean,
            default: true,
        },
        tags: [{ type: String, trim: true }],

        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        moderators: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        // denormalised “flattened” membership used for access control / queries
        members: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                index: true,
            },
        ],

        rules: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

// keep `members` in sync = owner + moderators + participants (unique)
GroupSchema.pre("save", function (next) {
    const self = this as IGroup;

    const ids: Types.ObjectId[] = [];

    if (self.ownerId) ids.push(self.ownerId);
    if (Array.isArray(self.moderators)) ids.push(...self.moderators);
    if (Array.isArray(self.participants)) ids.push(...self.participants);

    const uniqueMap = new Map<string, Types.ObjectId>();
    for (const id of ids) {
        if (!id) continue;
        uniqueMap.set(String(id), id);
    }

    self.members = Array.from(uniqueMap.values());

    next();
});

// text search
GroupSchema.index({
    name: "text",
    description: "text",
    city: "text",
    location: "text",
    tags: "text",
});

// filters
GroupSchema.index({ visibility: 1, isInviteOnly: 1, type: 1, city: 1 });
GroupSchema.index({ members: 1 });
GroupSchema.index({ ownerId: 1 });

const Group: Model<IGroup> =
    mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);

export default Group;
