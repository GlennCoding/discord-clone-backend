import mongoose from "mongoose";
import { NotFoundError } from "../utils/errors";
import Channel from "../models/Channel";
import ChannelMessage from "../models/ChannelMessage";

export const deleteChannel = async (channelId: string) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await ChannelMessage.deleteMany({ channel: channelId }, { session });
      const deleted = await Channel.findByIdAndDelete(
        { channel: channelId },
        { session }
      );
      if (!deleted) throw new NotFoundError("Channel");
    });
  } catch (err) {
    console.error("Transaction failed:", err);
    throw err;
  } finally {
    await session.endSession();
  }
};
