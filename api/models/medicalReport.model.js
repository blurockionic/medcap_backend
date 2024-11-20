import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        report: {
            type: String,
            required: true,
        },
        analysis: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

const reportsSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, "Please provide unique email"],
            unique: [true, "email Exist"],
        },
        reports: [reportSchema],
    },
    {
        timestamps: true,
    }
);

export const medicalReports = mongoose.model('reports', reportsSchema);