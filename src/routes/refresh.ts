import { Router } from "express";
import { handleRefreshToken } from "../controllers/refreshController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(handleRefreshToken));

export default router;
