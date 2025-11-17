# API endpoints (Servers)

--- User actions ---

- Create a channel -> POST /channel/:serverId
  - inputs: name
  - notify others in server "channel:created"
- Update a channel -> POST /channel/:serverId/:channelId
  - inputs: name
  - notify others in server "channel:updated"
- Delete a channel -> DELETE /channel/:serverId/:channelId
  - notify others in server "channel:deleted"
- Get all channels that I can view -> GET /channel/:serverId
  - returns: name, memberCount
- Subscribe to server & channel updates -> "server:subscribe"

--- REST API: With inputs, returns & errors ---

- Create a channel -> POST /channel/:serverId
  - inputs: name
  - return: id, name, order (set order +1 of current highest)
  - Errors:
    - Input field missing
- Update a channel -> POST /channel/:serverId/:channelId
  - inputs: name
  - return: name
  - Errors:
    - Server/Channel with that id doesn't exist
    - Input field missing
    - You're not the owner or don't have role with permission
- Delete a channel -> DELETE /channel/:serverId/:channelId
  - return: 204 Success
  - Errors:
    - Server/Channel with that id doesn't exist
    - You're not the owner or don't have role with permission
- Get all channels that I can view -> GET /channel/:serverId
  - return: name, memberCount
  - Errors:
    - Server doesn't exist

--- socketHandlers ---

- serverHandlers:
  - listen "server:subscribe"
      - input: server id
      - add socket to room with serverId
      - ack: ServerDTO
      - Errors:
        - Server doesn't exist
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