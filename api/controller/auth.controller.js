import express from 'express';
import jwt from 'jsonwebtoken';
import {users} from '../models/users.model.js';
import {medicalReports} from '../models/medicalReport.model.js';
import multer from 'multer';
import { admin, bucket } from '../../firebase.js';

const router = express.Router();

export const login = async (req, res) => {

    const { email, password } = req.body;
    const user = await users.findOne({"email" : email , "password" : password});
    console.log(user);
    if (!user) {
        return res.status(401).send({ message: 'Invalid email or password' });
    }

    const payload = {
        id: user._id,
        email: user.email
    };

    const accessToken = generateAccessToken(payload);
    // const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET);
    // res.json({ accessToken: accessToken, refreshToken: refreshToken });
    res.json({ accessToken: accessToken, user: {email:user.email, profilePicture:user.profilePicture, firstName:user.firstName}});
}


const storage = multer.memoryStorage(); // Use memory storage to keep file in memory temporarily
const upload = multer({ storage: storage }).single('profilePicture'); // Expect a single file with the field name 'profilePicture'

export const register = async (req, res) => {
    // Wrap the function in multer middleware
    upload(req, res, async (error) => {
        if (error) {
            return res.status(400).send({ message: "Error uploading file." });
        }

        try {
            console.log(req.body);
    
            const { 
                firstName, 
                lastName, 
                password, 
                email, 
                dob, 
                gender, 
                bloodType, 
                phone, 
                height, 
                weight 
            } = req.body;

            if (!firstName || !lastName || !password || !email || !dob || !gender || !bloodType || !phone || !height || !weight) {
                return res.status(400).send({ message: "Please provide all required fields" });
            }

            const existingUser = await users.findOne({ email: email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already exists' });
            }

            let profilePictureUrl = null;

            // Handle image upload to Firebase Storage
            if (req.file) {
                const { originalname, buffer } = req.file;
                const fileName = `${Date.now()}_${originalname}`;
                const file = bucket.file(fileName);

                // Upload the file to Firebase Storage
                await file.save(buffer, {
                    metadata: {
                        contentType: req.file.mimetype,
                    },
                    public: true, // Set to true if you want the file to be publicly accessible
                });

                // Get the file's public URL
                profilePictureUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            }

            const newUser = {
                firstName,
                lastName,
                password,
                email,
                dob,
                gender,
                bloodType,
                phone,
                height,
                weight,
                profilePicture: profilePictureUrl // Store the profile picture URL in the user object
            };

            const user = await users.create(newUser);

            const newReport = {
                email: email,
                reports: []
            };
            const report = await medicalReports.create(newReport);

            return res.status(201).send({ user, report });
        } catch (error) {
            console.log(error.message);
            return res.status(500).send({ message: error.message });
        }
    });
}


//update
export const updateUser = async (req, res) => {
    console.log("Updating user");
    // Use multer middleware to handle the image file upload
    upload(req, res, async (error) => {
        if (error) {
            console.log("Error uploading image");
            return res.status(400).send({ message: "Error uploading file." });
        }

        try {
            const { 
                firstName, 
                lastName, 
                email,
                dob, 
                gender, 
                bloodType, 
                phone, 
                height, 
                weight 
            } = req.body;

            // Check if required fields are provided
            if (!email || !firstName || !lastName || !dob || !gender || !bloodType || !phone || !height || !weight) {
                return res.status(400).send({ message: "Please provide all required fields" });
            }

            // Find the user in the database using their email
            const user = await users.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Handle profile picture upload if provided
            let profilePictureUrl = user.profilePicture; // Retain old profile picture if none is provided

            if (req.file) {
                const { originalname, buffer } = req.file;
                const fileName = `${Date.now()}_${originalname}`;
                const file = bucket.file(fileName);

                // Upload the file to Firebase Storage
                await file.save(buffer, {
                    metadata: {
                        contentType: req.file.mimetype,
                    },
                    public: true, // Set to true if you want the file to be publicly accessible
                });

                // Get the file's public URL
                profilePictureUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            }

            // Update the user's details
            user.firstName = firstName;
            user.lastName = lastName;
            user.dob = dob;
            user.gender = gender;
            user.bloodType = bloodType;
            user.phone = phone;
            user.height = height;
            user.weight = weight;
            user.profilePicture = profilePictureUrl;

            // Save the updated user to the database
            await user.save();

            // Create a response object with only the necessary fields
            const responseUser = {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePicture: user.profilePicture
            };

            return res.status(200).send({ user: responseUser, message: 'User updated successfully' });
        } catch (error) {
            console.log(error.message);
            return res.status(500).send({ message: error.message });
        }
    });
};





export const token = async (req, res) => {
    const refreshToken = req.body.token;
    if (refreshToken == null){
        return res.status(401).send({message : "Token not sent"});
    }
    const token = await Auth.findOne({"refreshToken" : refreshToken});
    if (token == null){
        return res.status(403).send({message : "token not in db"});
    }
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err){
            return res.status(403).send({message : "Invalid token"})
        }
        const accessToken = generateAccessToken({ name: user.name});
        res.json({ accessToken: accessToken});
    })
}

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
}

export const authenticateToken = async (req, res, next) => {
    console.log("authenticating token");
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) {
        console.log("Token not sent");
        return res.status(401).send({ message: "Token not sent" });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            console.log("Invalid token");
            return res.status(403).send({ message: "Invalid token" });
        }

        req.email = user.email;
        next();
    });
}

export const secure = async (req, res) => {
    try {
        const user = await users.findOne({ email: req.email }, '-password');

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        const reports = await medicalReports.findOne({ email: req.email });

        if (!reports) {
            return res.status(404).send({ message: 'Medical reports not found' });
        }

        return res.status(200).json({
            message: 'Authorized',
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePicture: user.profilePicture,
                dob: user.dob,
                gender: user.gender,
                bloodType: user.bloodType,
                phone: user.phone,
                height: user.height,
                weight: user.weight
            },
            medicalReports: reports.reports
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: 'Server error' });
    }
};


export default router;