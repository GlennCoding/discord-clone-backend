import { Router } from "express";

import { handleLogin } from "../controllers/authController";
import { authLoginLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", authLoginLimiter, asyncHandler(handleLogin));

export default router;
