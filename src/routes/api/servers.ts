import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createServer,
  updateServer,
  deleteServer,
  getAllPublicServers,
  getAllJoinedServers,
} from "../../controllers/serverController";

const router = Router();

router.post("/", asyncHandler(createServer));
router.put("/:id", asyncHandler(updateServer));
router.delete("/:id", asyncHandler(deleteServer));

router.get("/public", asyncHandler(getAllPublicServers));
router.get("/joined", asyncHandler(getAllJoinedServers));
// router.get("/:shortId");
// router.post("/:shortId/join", asyncHandler());

export default router;
