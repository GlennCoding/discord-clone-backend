# Tasks

- Feature: File upload in chat

  - Behaviour #1.a -> Create
    - User presses on file upload -> Calls POST /chat/id/file -> Returns path
  - Behaviours #1.b -> Receive file via socket
    - PUT controller sends file via socket rooms -> Need chatId
  - Behaviour #2.a -> Delete file
    - DELETE /chat/id/file -> Deletes file in bucket
  - Behaviour #2.b -> Receive delete file
    - DELETE controller sends update
  - Error cases
    - Wrong file format or no file sent in request
    - File uploads, but other user is looses connected to chatroom -> Use retry from BE to FE
    - File gets deleted in bucket, but not in BE -> Have error state in FE

- API

  - [ ] POST /chat/id/file
    - verify request: file existing, file format, chatId exists
    - await: upload file & generate path
    - await: create & save chatmessage document
      - if fails, delete file from bucket
    - await: send message to chat room (-> Needs to be sent to an event queue, to retry, if fails)
      - io.to(roomId).emit() -> Fails automatically if there is no active socket connection?
    - return res: path
  - [ ] DELETE /chat/id/file
  - [ ] socket handleJoinChat: load messages -> Load messages & attachments, but how to paginate? -> We want all in one list, don't we? -> Better to populate Attachment to Message

- Model

  - Message (includes an array of attachments) N->1 Chat

- Q: How to do an event queue, to not block request response (Hypothesis)
  - Queue with tasks, runs as it's own service
  - Send in task, then it gets saved there saved somewhere (maybe memory?)
  - One task after the other gets done + Send messages out to other chat rooms
- For now: wait till message got successfully to room

- Learning how to learn:
  - Like in chess
    1. Analyse whole chess board
    2. Try to come up with your own moves & hypothesis
    3. Make moves, play the game
    4. Get feedback, look at solutions, try to find better patterns
  - In programming
    1. Get a big picture of what you need to do and all the components of the thing that you're trying to build
    2. Make a hypothesis of how to implement your plan / solve your problem (google what you need to)
    3. Implement it
    4. Get feedback: AI coding review, human review, google better design patterns
  - When you feel lost: Play the most sensible move at this moment, that just gets you forward
