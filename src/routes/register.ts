import { Router } from "express";

import { handleRegister } from "../controllers/registerController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", asyncHandler(handleRegister));

export default router;
