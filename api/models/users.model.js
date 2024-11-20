import mongoose from "mongoose";

const userSchema = mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, "Please provide a first name"],
        },
        lastName: {
            type: String,
            required: [true, "Please provide a last name"],
        },
        password: {
            type: String,
            required: [true, "Please provide a password"],
        },
        email: {
            type: String,
            required: [true, "Please provide a valid email"],
            unique: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please provide a valid email address",
            ],
        },
        dob: {
            type: Date,
            required: [true, "Please provide your date of birth"],
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: [true, "Please select a gender"],
        },
        bloodType: {
            type: String,
            enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
            required: [true, "Please provide your blood type"],
        },
        profilePicture: {
            type: String,
            default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
        },
        phone: {
            type: String,
            required: [true, "Please provide a phone number"],
            match: [
                /^\+?[1-9]\d{1,14}$/, // Matches international phone numbers
                "Please provide a valid phone number",
            ],
        },
        height: {
            type: Number,
            required: [true, "Please provide your height in centimeters"],
            min: [30, "Height must be at least 30 cm"],
            max: [300, "Height cannot exceed 300 cm"],
        },
        weight: {
            type: Number,
            required: [true, "Please provide your weight in kilograms"],
            min: [10, "Weight must be at least 10 kg"],
            max: [500, "Weight cannot exceed 500 kg"],
        },
    },
    {
        timestamps: true,
    }
);

export const users = mongoose.model('users', userSchema);
