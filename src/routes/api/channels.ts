import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createChannel,
  updateChannel,
  deleteChannel,
} from "../../controllers/channelController";

const router = Router();

router.post("/:serverId", asyncHandler(createChannel));
router.put("/:serverId/:channelId", asyncHandler(updateChannel));
router.delete("/:serverId/:channelId", asyncHandler(deleteChannel));

export default router;
