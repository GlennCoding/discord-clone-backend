import { Router } from "express";
import { handleLogin } from "../controllers/authController";
import { asyncHandler } from "../utils/asyncHandler";
import { authLoginLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/", authLoginLimiter, asyncHandler(handleLogin));

export default router;
