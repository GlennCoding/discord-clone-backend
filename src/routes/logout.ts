import { Router } from "express";

import { handleLogout } from "../controllers/logoutController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", asyncHandler(handleLogout));

export default router;
