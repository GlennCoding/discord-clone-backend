import { Router } from "express";
import { handleLogin } from "../controllers/authController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", asyncHandler(handleLogin));

export default router;
