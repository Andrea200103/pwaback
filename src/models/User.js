import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true }, //sirve para que los datos no tengan espacios en blanco al inicio o al final y no caduquen.
        email: { type: String, required: true, trim: true, unique: true, lowercase: true },
        password: { type: String, required: true },
    },
    { 
        timestamps: true 
    }
);

export default mongoose.model("User", userSchema);
    
