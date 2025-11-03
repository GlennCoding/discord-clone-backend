import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createServer, updateServer } from "../../controllers/serverController";

const router = Router();

router.post("/", asyncHandler(createServer));
router.put("/:id", asyncHandler(updateServer));
// router.delete("/:id", asyncHandler());

// router.get("/public", asyncHandler());
// router.get("/joined", asyncHandler());
// router.get("/:shortId");
// router.post("/:shortId/join", asyncHandler());

export default router;
