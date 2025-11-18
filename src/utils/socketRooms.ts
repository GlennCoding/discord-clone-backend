export const serverRoom = (serverId: string) => `server:${serverId}`;

export const channelRoom = (channelId: string) => `channel:${channelId}`;

export const channelMessagesRoom = (channelId: string) =>
  `channelMessages:${channelId}`;
