import { Router } from "express";

import { getMe } from "../../controllers/meController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getMe));

export default router;
