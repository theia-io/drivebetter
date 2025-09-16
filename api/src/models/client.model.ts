import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClient extends Document {
    name: string;
    phone: string;
    notes?: string;
    savedAddresses?: string[];
    cardsOnFile?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
    {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        notes: { type: String },
        savedAddresses: [{ type: String }],
        cardsOnFile: [{ type: String }],
    },
    { timestamps: true }
);

const Client: Model<IClient> =
    mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);

export default Client;
