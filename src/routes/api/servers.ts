import { Router } from "express";

import {
  createServer,
  updateServer,
  deleteServer,
  getAllPublicServers,
  getAllJoinedServers,
  getServer,
  joinServer,
} from "../../controllers/serverController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.post("/", asyncHandler(createServer));
router.put("/:id", asyncHandler(updateServer));
router.delete("/:id", asyncHandler(deleteServer));

router.get("/public", asyncHandler(getAllPublicServers));
router.get("/joined", asyncHandler(getAllJoinedServers));
router.get("/:shortId", asyncHandler(getServer));
router.get("/:shortId", asyncHandler(getServer));
router.post("/:shortId/join", asyncHandler(joinServer));

export default router;
