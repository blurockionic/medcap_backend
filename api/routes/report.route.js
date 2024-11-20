import express from "express";

import { addRecord, upload } from "../controller/report.controller.js";

const router = express.Router();

router.post('/addrecord', upload.single('reportFile'), addRecord);

export default router;
