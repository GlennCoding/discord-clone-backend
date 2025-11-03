import { Response } from "express";
import { UserRequest } from "../middleware/verifyJWT";
import z from "zod";
import {
  CreateServerDTO,
  CreateServerInput,
  UpdateServerDTO,
  UpdateServerInput,
} from "../types/dto";
import Server from "../models/Server";
import { ensureParam, ensureUser } from "../utils/helper";
import { randomShortId } from "../utils/ids";
import Member from "../models/Member";
import { CustomError, NoPermissionError, NotFoundError } from "../utils/errors";
import { IRole, RolePermission } from "../models/Role";
import { isDeepStrictEqual } from "util";

const baseServerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().max(500).optional(),
  isPublic: z.boolean(),
});

export const createServerSchema = baseServerSchema;
export const updateServerSchema = baseServerSchema;

const generateUniqueShortId = async (): Promise<string> => {
  let shortId = randomShortId();

  while (await Server.exists({ shortId })) {
    shortId = randomShortId();
  }
  return shortId;
};

const checkPermissionInRoles = (roles: IRole[], permission: RolePermission) => {
  for (const role of roles) {
    const hasPermission = role.permissions.some((p) => p === permission);
    if (hasPermission) return true;
  }
  return false;
};

export const createServer = async (
  req: UserRequest<CreateServerInput>,
  res: Response<CreateServerDTO>
) => {
  const payload = createServerSchema.parse(req.body);
  const owner = await ensureUser(req.userId);

  const shortId = await generateUniqueShortId();

  const server = await Server.create({ ...payload, owner, shortId });
  await Member.create({ user: owner._id, server: server._id });

  res.status(201).json({ shortId } satisfies CreateServerDTO);
};

export const updateServer = async (
  req: UserRequest<UpdateServerInput>,
  res: Response<UpdateServerDTO>
) => {
  const serverId = ensureParam("shortId", req.params.id, { isObjectId: true });
  const payload = updateServerSchema.parse(req.body);
  const user = await ensureUser(req.userId);

  // check if server exists
  const foundServer = await Server.findById(serverId).populate("owner");
  if (!foundServer) throw new NotFoundError("Server");

  // check if user has permission
  const foundMember = await Member.findOne({ user, server: foundServer }).populate(
    "roles"
  );
  if (!foundMember) throw new CustomError(403, "You are no member of this server");

  const isOwner = foundServer.owner.id === user.id;

  const hasServerAdminPermission = checkPermissionInRoles(
    foundMember.roles,
    RolePermission.ServerAdmin
  );

  if (!isOwner && !hasServerAdminPermission) throw new NoPermissionError();

  // upate server document
  const serverContents = {
    name: foundServer.name,
    isPublic: foundServer.isPublic,
    description: foundServer.description,
  };

  if (isDeepStrictEqual(serverContents, payload)) {
    res.status(200).json(serverContents);
    return;
  }

  foundServer.name = payload.name;
  foundServer.description = payload.description;
  foundServer.isPublic = payload.isPublic;
  const updatedServer = await foundServer.save();

  res.status(200).json({
    name: updatedServer.name,
    isPublic: updatedServer.isPublic,
    description: updatedServer.description,
  });
};
