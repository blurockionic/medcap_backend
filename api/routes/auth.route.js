import express from "express";
import { login, register, secure, authenticateToken, updateUser } from "../controller/auth.controller.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.put("/update", authenticateToken, updateUser);
//verify auth
router.get('/secure', authenticateToken, secure);

export default router;
