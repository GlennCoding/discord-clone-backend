import { Router } from "express";

import { getServer } from "../../controllers/serverController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/:shortId", asyncHandler(getServer));

export default router;

