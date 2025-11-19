import mongoose, { Schema, Document, Model, Types } from "mongoose";
import DriverDetails from "./driverDetails.model";

export interface IDriverReview extends Document {
    driverId: Types.ObjectId;
    rideId?: Types.ObjectId | null;
    reviewerId: Types.ObjectId; // who left the feedback (dispatcher/admin/customer userId)
    rating: number; // 1..5 (integer)
    comment?: string;
    tags?: string[]; // optional quick tags: "on-time", "clean car", etc.
    createdAt: Date;
    updatedAt: Date;
}

const DriverReviewSchema = new Schema<IDriverReview>(
    {
        driverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        rideId: { type: Schema.Types.ObjectId, ref: "Ride", default: null, index: true },
        reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String, trim: true },
        tags: [{ type: String, trim: true }],
    },
    { timestamps: true }
);

// Prevent duplicate feedback for the same driver & ride from the same reviewer (optional)
DriverReviewSchema.index({ driverId: 1, rideId: 1, reviewerId: 1 }, { unique: true, sparse: true });

// Helper: recompute rating summary into DriverDetails.stats
export async function recomputeDriverRating(driverId: Types.ObjectId) {
    const Review = mongoose.model<IDriverReview>("DriverReview");
    const agg = await Review.aggregate([
        { $match: { driverId } },
        {
            $group: {
                _id: "$driverId",
                count: { $sum: 1 },
                avg: { $avg: "$rating" },
            },
        },
    ]);

    const summary = agg[0];
    const ratingCount = summary?.count ?? 0;
    const ratingAvg = ratingCount ? Math.round((summary.avg + Number.EPSILON) * 10) / 10 : 0;

    await DriverDetails.updateOne(
        { userId: driverId },
        { $set: { "stats.ratingCount": ratingCount, "stats.ratingAvg": ratingAvg } },
        { upsert: false }
    );
}

const DriverReview: Model<IDriverReview> =
    mongoose.models.DriverReview ||
    mongoose.model<IDriverReview>("DriverReview", DriverReviewSchema);

export default DriverReview;
