import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGroup extends Document {
    name: string;
    type: "local" | "corporate" | "global";
    members: string[]; // Array of User IDs
    city?: string;
    createdAt: Date;
    updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
    {
        name: { type: String, required: true },
        type: { type: String, enum: ["local", "corporate", "global"], required: true },
        members: [{ type: Schema.Types.ObjectId, ref: "User" }],
        city: { type: String },
    },
    { timestamps: true }
);

const Group: Model<IGroup> =
    mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);

export default Group;
