import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getServer } from "../../controllers/serverController";

const router = Router();

router.get("/:shortId", asyncHandler(getServer));

export default router;

