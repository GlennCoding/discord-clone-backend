# Where to implement transactions?

# Cascade operations
- Delete Server
  - Channels -> Channel_Messages
  - Members
  - Roles

- Delete Channel -> ChannelMessages

- Delete Roles -> Delete entry from Member & Channels

- Member -> ?? Set Model to inactive member? + Delete it's roles?

- Delete Chat -> ChatMessages

### Delete Chat
Within chatService.ts
- start a session
- do operations (session.withTransaction)
- end session

---------------

# Backround jobs to delete images in background
- Within transaction send task to a BG queue to delete attachments async