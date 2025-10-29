import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getMe } from "../../controllers/meController";

const router = Router();

router.get("/", asyncHandler(getMe));

export default router;
