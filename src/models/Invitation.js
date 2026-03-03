import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Invitation", invitationSchema);