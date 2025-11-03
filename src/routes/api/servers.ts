import { Router } from "express";
import multer from "multer";
import {
  deleteProfileImg,
  getProfile,
  updateProfile,
  updateProfileImg,
} from "../../controllers/profileController";
import { asyncHandler } from "../../utils/asyncHandler";
import { createServer } from "../../controllers/serverController";

const router = Router();

router.post("/", asyncHandler(createServer));
// router.put("/:id");
// router.delete("/:id", asyncHandler());

// router.get("/public", asyncHandler());
// router.get("/joined", asyncHandler());
// router.get("/:shortId");
// router.post("/:shortId/join", asyncHandler());

export default router;
