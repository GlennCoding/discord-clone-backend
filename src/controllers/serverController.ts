import { Response } from "express";
import { UserRequest } from "../middleware/verifyJWT";
import z from "zod";
import { CreateServerDTO, CreateServerInput } from "../types/dto";
import Server from "../models/Server";
import { ensureUser } from "../utils/helper";
import { randomShortId } from "../utils/ids";
import Member from "../models/Member";

const baseServerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().max(500).optional(),
  isPublic: z.boolean(),
});

export const createServerSchema = baseServerSchema;
export const updateServerSchema = baseServerSchema;

const generateUniqueShortId = async (): Promise<string> => {
  let shortId = randomShortId();
  // loop until we find an unused id; collisions are unlikely but cheap to guard
  while (await Server.exists({ shortId })) {
    shortId = randomShortId();
  }
  return shortId;
};

export const createServer = async (req: UserRequest, res: Response) => {
  // validate inputs
  const payload: CreateServerInput = createServerSchema.parse(req.body);
  const owner = await ensureUser(req.userId);

  const shortId = await generateUniqueShortId();

  // create Server
  const server = await new Server({ ...payload, owner, shortId });

  await Member.create({ user: owner._id, server: server._id });

  res.status(201).json({ shortId } satisfies CreateServerDTO);
};
