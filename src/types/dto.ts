export interface LoginDTO {
  message: string;
  userData: MeDTO;
  csrfToken: string;
}

export type RegisterDTO = LoginDTO;

export interface RefreshInput {
  issueNewSsrToken?: boolean;
}

export interface AttachmentDTO {
  downloadUrl: string;
}

export interface MessageDTO {
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

export interface MeDTO {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface ChatDTO {
  chatId: string;
  participant: string;
  participantAvatarUrl?: string;
}

export interface JoinChatDTO {
  participant: {
    username: string;
    avatarUrl?: string;
  };
  messages: MessageDTO[];
}

export interface DeleteMessageAttachmentInput {
  messageId: string;
  attachmentPath: string;
}

export interface SaveMessageAttachmentInput {
  chatId: string;
  text?: string;
}

export interface SendMessageInput {
  chatId: string;
  text: string;
}

export interface ProfileDTO {
  userName: string;
  status: string;
  profileImgUrl?: string;
}

export interface CreateServerInput {
  name: string;
  description?: string;
  isPublic: boolean;
}

export interface CreateServerDTO {
  shortId: string;
}

export type UpdateServerInput = CreateServerInput;

export type UpdateServerDTO = UpdateServerInput;

export interface ChannelDTO {
  id: string;
  order: number;
  name: string;
}

export interface MemberDTO {
  name: string;
  roles: string[];
  avatarUrl?: string;
}

export interface ServerDTO {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  channels: ChannelDTO[];
  members: MemberDTO[];
}

export interface JoinServerDTO {
  shortId: string;
}

export interface ServerListItemDTO {
  name: string;
  shortId: string;
  description?: string;
  iconUrl?: string;
}

export interface ServerListDTO {
  servers: ServerListItemDTO[];
}

export interface UpdatedServerDTO {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface ChannelMessageDTO {
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

export interface ChannelSubscribeDTO {
  serverId: string;
  channel: ChannelDTO;
  messages: ChannelMessageDTO[];
}

export interface SendChannelMessageInput {
  channelId: string;
  text: string;
}
