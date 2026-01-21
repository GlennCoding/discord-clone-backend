import { Router } from "express";
import { handleRefreshToken } from "../controllers/refreshController";
import { asyncHandler } from "../utils/asyncHandler";
import { authRefreshLimiter } from "../middleware/rateLimit";

const router = Router();

router.get("/", authRefreshLimiter, asyncHandler(handleRefreshToken));

export default router;
