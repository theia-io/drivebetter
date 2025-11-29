import mongoose, {Schema, model, Types, Document, Model} from "mongoose";

export type GroupVisibility = "public" | "private";
export type GroupType = "fleet" | "coop" | "airport" | "city" | "custom" | "global";

export interface IGroup extends Document {
    name: string;
    type: GroupType;
    city?: string;
    location?: string;
    visibility: GroupVisibility;
    isInviteOnly: boolean;

    description?: string;
    rules?: string;
    tags: string[];

    ownerId: Types.ObjectId;
    moderators: Types.ObjectId[];
    participants: Types.ObjectId[];

    createdBy?: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["fleet", "coop", "airport", "city", "custom", "global"],
            default: "custom",
        },
        city: {
            type: String,
            trim: true,
        },
        location: {
            type: String,
            trim: true,
        },
        visibility: {
            type: String,
            enum: ["public", "private"],
            default: "private",
        },
        isInviteOnly: {
            type: Boolean,
            default: true,
        },

        description: {
            type: String,
            trim: true,
        },
        rules: {
            type: String,
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
        },

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
                index: true,
            },
        ],
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                index: true,
            },
        ],

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    },
);

GroupSchema.index({
    name: "text",
    city: "text",
    tags: "text",
});

export const Group: Model<IGroup> =
    mongoose.models.IGroup || mongoose.model<IGroup>("Group", GroupSchema);
