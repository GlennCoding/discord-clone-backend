# API endpoints (Servers)

--- User actions ---

- Create a server -> POST /server
  - inputs: name, description
- Update a server -> POST /server/:id
  - inputs: name, description
- Delete a server -> DELETE /server/:id
- Get all public servers -> GET /server/public
- Get my servers -> GET /server/mine
- Get one server -> GET /server/:id
- Join server -> POST /server/join

--- With inputs, returns & errors ---

- Create a server -> POST /server
  - inputs: name, description, isPublic
  - return: slug
  - Errors:
    - Name input missing
- Update a server -> POST /server/:id
  - inputs: name, description, isPublic
  - return: name, description, isPublic
  - Errors:
    - Server with that id doesn't exist
    - Input field missing
    - You're not the owner or don't have role with permission
- Delete a server -> DELETE /server/:id
  - return: 204 Success
  - Errors:
    - Server with that id doesn't exist
    - You're not the owner
- Get all public servers -> GET /server/public
  - return: servers list with isPublic === true
- Get my servers -> GET /server/joined
  - return: server list with Server <- Member <- User
- Get one server -> GET /server/:id
  - return: server
  - Errors:
    - Server doesn't exist
    - You are not part of this server
- Join server -> POST /server/:id/join
  - return: success
  - Errors:
    - Server doesn't exist

