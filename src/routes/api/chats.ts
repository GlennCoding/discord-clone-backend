import { Router, Response, Request } from "express";
import { UserRequest } from "../../middleware/verifyJWT";
import User from "../../models/User";
import Chat from "../../models/Chat";

const router = Router();

router.post("/create", async (req: UserRequest, res: Response) => {
  // get userName from body
  const { participant } = req.body || {};

  if (!participant) {
    res.status(404).json({ message: "Participant is required" });
    return;
  }

  // check if userName isn't own and exists in DB
  try {
    const foundUser = await User.findOne({ userName: participant });

    if (!foundUser) {
      res
        .status(400)
        .json({ message: `A user with the username ${participant} doesn't exist` });
      return;
    }

    if (foundUser.id === req.userId) {
      res.status(400).json({ message: `You can't start a chat with yourself` });
      return;
    }

    // see if a chat doesn't exist already
    const chatExists = await Chat.findOne({
      participants: [req.userId, foundUser._id],
    });

    if (chatExists) {
      res.status(200).json({ chatId: chatExists.id });
      return;
    }

    // create a chat document with this user and other user
    const newChat = await Chat.create({ participants: [req.userId, foundUser._id] });

    console.log(newChat);

    res.status(201).json({ chatId: newChat.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
});

router.get("/:chatId", (req: UserRequest, res: Response) => {
  const chatId = req.params;

  res.send(chatId);
  // check if chatId exists & user is a participant

  // respond with chat messages: newest to oldest

  // res.send({ message: "Hello wonderful world!" });
});

export default router;
