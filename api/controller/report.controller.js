import express from 'express';
import multer from 'multer';
import { medicalReports } from '../models/medicalReport.model.js';
import dotenv from 'dotenv';
import path from 'path';
import {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    ExtractPDFParams,
    ExtractElementType,
    ExtractPDFJob,
    ExtractPDFResult
} from "@adobe/pdfservices-node-sdk";
import fs from "fs";
import AdmZip from "adm-zip";
import extractTextFromPDF from './extract.js';
import pkg from '@adobe/pdfservices-node-sdk';
const { PDFServicesSdk } = pkg;
import axios from 'axios';
import { api_key } from '../../config.js';

dotenv.config(); // Load environment variables from .env file

const router = express.Router();

// Setup multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
export const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
    fileFilter: (req, file, cb) => {
        const fileTypes = /pdf|doc|docx|jpg|jpeg|png/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, JPG, JPEG, and PNG files are allowed.'));
        }
    }
});

// Route to handle adding medical report records with optional file upload
export const addRecord = async (req, res) => {
    try {
        if (!req.body.email || !req.body.newReport) {
            return res.status(400).send({ message: `Please send all required fields` });
        }

        const { email, newReport } = req.body;
        const file = req.file; // File uploaded, if any

        const User = await medicalReports.findOne({ email: email });
        let prevReport = '';
        let prevAnalysis = '';

        if (!User) {
            const newUser = new medicalReports({ email: email, reports: [] });
            await newUser.save();
        } else if (User.reports.length > 0) {
            const latestReport = User.reports.sort((a, b) => b.createdAt - a.createdAt)[0];
            prevReport = latestReport.report;
            prevAnalysis = latestReport.analysis;
        }

        // Handle file upload and extract text if it's a PDF
        let fileDetails = {};
        if (file) {
            if (file.mimetype === 'application/pdf') {
                const pdfText = await extractTextFromPDF(file.buffer);
                fileDetails.text = pdfText; 
                fileDetails.originalname = file.originalname; 
            } else {
                fileDetails.text = `File uploaded: ${file.originalname}`;
            }
        }
        console.log(`${fileDetails.text}`);

        let analysis = await generate(prevReport, prevAnalysis, newReport, fileDetails);
        analysis = JSON.stringify(analysis);
        // console.log(analysis);

        User.reports.push({ report: `Form content: ${newReport}\nAttached file content: ${fileDetails.text}`, analysis: analysis });
        await User.save();

        return res.status(201).send(analysis);
    } catch (error) {
        console.log(error.message);
        return res.status(500).send({ message: error.message });
    }
};


// The generate function remains the same
async function generate(prevResult, prevAnalysis, newResult, fileDetails = null) {
    let prompt = '';
    let res = '';

    const exampleJsonFormat = `
    {
        "Summary of Current Condition": "",
        "Diet Plan": {
            "Eat": [
                {
                    "Food": "",
                    "Benefit": ""
                },
                {
                    "Food": "",
                    "Benefit": ""
                }
            ],
            "Avoid": [
                {
                    "Food": "",
                    "Reason": ""
                },
                {
                    "Food": "",
                    "Reason": ""
                }
            ],
            "Example Diet Plan": {
                "Breakfast": "",
                "Lunch": "",
                "Dinner": "",
                "Snacks": ""
            },
            "Daily Calorie Intake": {
                "Recommendation": "",
                "Sodium Content": ""
            }
        },
        "Lifestyle Plan": {
            "Exercise": [
                {
                    "Type": "",
                    "Frequency": "",
                    "Duration": ""
                },
                {
                    "Type": "",
                    "Frequency": "",
                    "Duration": ""
                }
            ],
            "Daily Physical Activities": [""],
            "Minimum Times": "",
            "Skincare": "",
            "Meditation and Relaxation Techniques": ""
        },
        "Precaution Plan": {
            "At-Risk Diseases": "",
            "Precautions": ""
        }
    }`;

    if (!prevResult || prevResult === '') {
        prompt = `
        Following is the medical report of a patient. Go through it and provide a comprehensive summary analysis including the following sections:
        1. **Summary of Current Condition**: Generate a summary of the analysis for the patient in second person.(the patient will be reading this)
        2. **Diet Plan**: 
            - What to eat (e.g., types of green veggies, fruits, etc.) and the benefits of each.
            - What to avoid (e.g., salt, sugar) and reasons for avoidance.
            - An example diet plan throughout the day (breakfast, lunch, dinner, snacks).
            - Daily calorie intake recommendations, including sodium content.
        3. **Lifestyle Plan**: 
            - Recommended exercises, their frequency, and duration.
            - Suggestions for daily physical activities and minimum times.
            - Skincare tips, meditation, and relaxation techniques if required.
        4. **Precaution Plan**: 
            - Information on any at-risk diseases and precautions the patient should take.
        Provide the result in JSON format as shown below:*important: only send response in json format as the server will crash if its not in json*(height will be in cm,weight in kg,heart rate in bpm unless specified otherwise)
        ${exampleJsonFormat}
        `;

        if (fileDetails && fileDetails.text) {
            prompt += `\n *Current Attached file content*: ${fileDetails.text}`;
        }
        else {
            prompt += `\n *Current Attached file content*: none`;
        }

        //console.log(prompt + "\n *Current report*: " + newResult);

        res = await axios({
            url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + api_key,
            method: "post",
            data: {
                "contents": [{
                    "parts": [{
                        "text": prompt + "\n *Current report*: " + newResult
                    }]
                }]
            }
        });
    } else {
        prompt = `
        Following are the previous and current medical results of a patient. Go through them and provide a comprehensive summary report including the following sections:
        1. **Summary of Current Condition**: Generate a summary of the analysis for the patient in second person.(the patient will be reading this) Compare previous and current results, noting improvements or declines in health.
        2. **Diet Plan**: 
            - What to eat (e.g., types of green veggies, fruits, etc.) and the benefits of each.
            - What to avoid (e.g., salt, sugar) and reasons for avoidance.
            - An example diet plan throughout the day (breakfast, lunch, dinner, snacks).
            - Daily calorie intake recommendations, including sodium content.
        3. **Lifestyle Plan**: 
            - Recommended exercises, their frequency, and duration.
            - Suggestions for daily physical activities and minimum times.
            - Skincare tips, meditation, and relaxation techniques if required.
        4. **Precaution Plan**: 
            - Information on any at-risk diseases and precautions the patient should take.
        Provide the result in JSON format as shown below:*important: only send response in json format as the server will crash if its not in json*(height will be in cm,weight in kg,heart rate in bpm unless specified otherwise)
        ${exampleJsonFormat}
        `;

        if (fileDetails && fileDetails.text) {
            prompt += `\n *Current Attached file content*: ${fileDetails.text}`;
        }
        else {
            prompt += `\n *Current Attached file content*: none`;
        }

        //console.log(prompt + "\n *Current report*: " + newResult + "\n *Previous report*: " + prevResult + "\n *Previous analysis*: " + prevAnalysis);

        res = await axios({
            url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + api_key,
            method: "post",
            data: {
                "contents": [{
                    "parts": [{
                        "text": prompt + "\n *Current report*: " + newResult + "\n *Previous report*: " + prevResult + "\n *Previous analysis*: " + prevAnalysis 
                    }]
                }]
            }
        });
    }

    const result = res["data"]["candidates"][0]["content"]["parts"][0]["text"];
    //console.log("Raw result string:", result);

    try {
        const cleanedResult = result.replace(/```json|```/g, '').trim(); // Clean markdown
        const jsonData = JSON.parse(cleanedResult); // Parse JSON
        //console.log("Parsed JSON data:", jsonData);
        return jsonData; // Return parsed JSON
    } catch (error) {
        console.error("Error parsing JSON:", error);
        return null; // Handle parsing error
    }
}

export default router;
