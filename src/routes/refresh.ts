import { Router } from "express";

import { handleRefreshToken } from "../controllers/refreshController";
import { authRefreshLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", authRefreshLimiter, asyncHandler(handleRefreshToken));

export default router;
