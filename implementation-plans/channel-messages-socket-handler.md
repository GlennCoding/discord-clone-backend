# Events

- Implement socket events for
  - listen: channelMessages:subscribe
    - ack: ChannelDTO, ChannelMessageDTO[]
  - listen: channelMessages:unsubscribe
  - listen: channelMessage:new
    - input: ChannelMessageDTO
    - ack: ChannelMessageDTO
  - event: channelMessage:new 
    - data: ChannelMessageDTO

# Implementation

- handleSubscribe
  - input: channelId
  - operations
    - ensureParam("channelId", channelId, { isObjectId: true });
    - ensure userId
    - const channelSubscribeDTO: ChannelSubscribeDTO = buildChannelMessagesPayload (input: channelId, userId -> output: ChannelSubscribeDTO)
      - Find channel with channelId
        - If doesn't exist, then error
      - Check if user is member of server & has permisson to see channel
      - const channelMessages -> Message.find({ channel })
      - socket.join(channelMessagesRoom(channelId))
      - Return ChannelSubscribeDTO, which includes both channel and channelMessages
    - Ack: Ack<ChannelSubscribeDTO>
- handleIncomingMessage
  - input: channelId, message (SendChannelMessageInput)
  - operations
    - ensureParam("channelId", channelId, { isObjectId: true });
    - ensure userId
    - check if channel exists
    - check if user is member of server & has permisson to see channel
    - create new ChannelMessage & save it
      - populate new message with sender's userName and avatar & channelId
    - transform ChannelMessage to ChannelMessageDTO
    - broadcast new messagge to room -> socket.to
    - Ack: Ack<ChannelMessageDTO>
- handleUnsubscribe
  - input: serverId, channelId
  - operations
    - ensureParam("channelId", channelId, { isObjectId: true });
    - socket.leave(channelMessagesRoom(channelId))
