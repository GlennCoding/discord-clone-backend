export type LoginDTO = {
  message: string;
  userData: MeDTO;
}

export type RegisterDTO = LoginDTO;

export type RefreshInput = {
  issueNewSsrToken?: boolean;
}

export type AttachmentDTO = {
  downloadUrl: string;
}

export type MessageDTO = {
  id: string;
  text: string;
  chatId: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt?: string;
  attachments?: AttachmentDTO[];
}

export type MeDTO = {
  id: string;
  username: string;
  avatarUrl?: string;
}

export type ChatDTO = {
  chatId: string;
  participant: string;
  participantAvatarUrl?: string;
}

export type JoinChatDTO = {
  participant: {
    username: string;
    avatarUrl?: string;
  };
  messages: MessageDTO[];
}

export type DeleteMessageAttachmentInput = {
  messageId: string;
  attachmentPath: string;
}

export type SaveMessageAttachmentInput = {
  chatId: string;
  text?: string;
}

export type SendMessageInput = {
  chatId: string;
  text: string;
}

export type ProfileDTO = {
  userName: string;
  status: string;
  profileImgUrl?: string;
}

export type CreateServerInput = {
  name: string;
  description?: string;
  isPublic: boolean;
}

export type CreateServerDTO = {
  shortId: string;
}

export type UpdateServerInput = CreateServerInput;

export type UpdateServerDTO = UpdateServerInput;

export type ChannelDTO = {
  id: string;
  order: number;
  name: string;
}

export type MemberDTO = {
  name: string;
  roles: string[];
  avatarUrl?: string;
}

export type ServerDTO = {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  channels: ChannelDTO[];
  members: MemberDTO[];
}

export type JoinServerDTO = {
  shortId: string;
}

export type ServerListItemDTO = {
  name: string;
  shortId: string;
  description?: string;
  iconUrl?: string;
}

export type ServerListDTO = {
  servers: ServerListItemDTO[];
}

export type UpdatedServerDTO = {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

export type ChannelMessageDTO = {
  id: string;
  text: string;
  channelId: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt?: string;
  attachments?: AttachmentDTO[];
}

export type ChannelSubscribeDTO = {
  serverId: string;
  channel: ChannelDTO;
  messages: ChannelMessageDTO[];
}

export type SendChannelMessageInput = {
  channelId: string;
  text: string;
}
