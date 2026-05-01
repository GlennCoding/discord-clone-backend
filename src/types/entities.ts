export type UserEntity = {
  id: string;
  userName: string;
  password: string;
  status?: string;
  avatar?: {
    filePath: string;
    url: string;
  };
  refreshTokens?: string[];
};

export type ChatEntity = {
  id: string;
  participantIds: string[];
  createdAt: Date;
  updatedAt?: Date;
};

export type ChatMessageEntity = {
  id: string;
  chatId: string;
  sender: {
    id: string;
    username: string;
    avatarUrl: string | undefined;
  };
  createdAt: Date;
  updatedAt?: Date;
  text: string;
  attachments: { path: string; downloadUrl: string }[] | undefined;
};

export type ServerEntity = {
  id: string;
  name: string;
  shortId: string;
  iconUrl?: string;
  ownerId: string;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt?: Date;
};

export type ChannelEntity = {
  id: string;
  serverId: string;
  name: string;
  order: number;
  disallowedRoleIds: string[];
  createdAt: Date;
  updatedAt?: Date;
};

export type ChannelMessageEntity = {
  id: string;
  channelId: string;
  senderId: string;
  text?: string;
  attachments?: { path: string; downloadUrl: string }[];
  createdAt: Date;
  updatedAt?: Date;
};

export type RoleEntity = {
  id: string;
  serverId: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  updatedAt?: Date;
};
