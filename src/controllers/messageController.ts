import { UserRequest } from "../middleware/verifyJWT";
import { Response } from "express";

export const saveMessageAttachment = async (req: UserRequest, res: Response) => {
  // verify request
  // upload file
  // create & save Message document (if fails, delete file from bucket)
  // emit new message to chatroom
  // Send back Message DTO
};
