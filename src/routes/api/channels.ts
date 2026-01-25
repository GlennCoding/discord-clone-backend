import { Router } from "express";

import {
  createChannel,
  updateChannel,
  deleteChannel,
} from "../../controllers/channelController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.post("/:serverId", asyncHandler(createChannel));
router.put("/:serverId/:channelId", asyncHandler(updateChannel));
router.delete("/:serverId/:channelId", asyncHandler(deleteChannel));

export default router;
