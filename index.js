import express from 'express';
import { PORT, mongoDBURL } from './config.js';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

//import routes
import authRoute  from "./api/routes/auth.route.js"
import recordRoute  from "./api/routes/report.route.js"

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Uncomment and change frontend url for deployment

const corsOptions = {
    origin: 'https://medcape.vercel.app',
};

app.use(cors(corsOptions));

// Uncomment for localhost
// app.use(cors());


mongoose
    .connect(mongoDBURL, {
        dbName: "Medcap_db", 
      })
    .then(() => {
        console.log(`connected to mongoDB database`);
        app.listen(PORT, () => {
            console.log(`conncted to port: ${PORT}`);
        });
    })
    .catch((error) => {
        console.log(error);
});

app.get('/', (req, res) => {
    res.json("server live");
})

app.use(`/api/auth`, authRoute);

app.use(`/api/report`, recordRoute);