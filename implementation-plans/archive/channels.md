# Channels Implementation Plan

[Note: Leaving out role management for now and channel re-ordering]

--- User actions ---

- Create a channel -> POST /channel/:serverId
  - inputs: name
  - notify others in server "channel:created"
- Update a channel -> PUT /channel/:serverId/:channelId
  - inputs: name
  - notify others in server "channel:updated"
- Delete a channel -> DELETE /channel/:serverId/:channelId
  - notify others in server "channel:deleted"
- Subscribe to server & channel updates -> "server:subscribe"

--- REST API: With inputs, returns & errors ---

- Create a channel -> POST /channel/:serverId
  - inputs: name
  - checks if user is member & has permission (owner or SERVER_ADMIN || CHANNEL_ADMIN)
  - emit "channel:created" event
  - return: id, name, order (set order +1 of current highest)
  - Errors:
    - Input field missing
- Update a channel -> PUT /channel/:serverId/:channelId
  - inputs: name
  - checks if user is member & has permission (owner or SERVER_ADMIN || CHANNEL_ADMIN)
  - emit "channel:updated" event
  - return: name
  - Errors:
    - Server/Channel with that id doesn't exist
    - Input field missing
    - You're not the owner or don't have role with permission
- Delete a channel -> DELETE /channel/:serverId/:channelId
  - checks if user is member & has permission (owner or SERVER_ADMIN || CHANNEL_ADMIN)
  - emit "channel:deleted" event
  - return: 204 Success
  - Errors:
    - Server/Channel with that id doesn't exist
    - You're not the owner or don't have role with permission

--- socketHandlers ---

- serverHandlers:
  - listen "server:subscribe"
      - input: server id
      - checks if user member of server
      - add socket to room with serverId
      - ack: ServerDTO
      - Errors:
        - Server doesn't exist
  - listen "server:unsubscribe"
    - input: serverId
    - removes user socket from server subscripton
  - emit "server:updated" -> Returns updated server data
    - send: UpdatedServerDTO
  - emit "server:deleted"
    - send: serverId
  - emit "channel:created" -> Returns created channel
    - send: ChannelDTO
  - emit "channel:deleted" -> Returns deleted channelId
    - send: channelId
  - emit "channel:updated" -> Returns updated channel
    - send: ChannelDTO