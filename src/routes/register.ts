import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { handleRegister } from "../controllers/registerController";

const router = Router();

router.post("/", asyncHandler(handleRegister));

export default router;
