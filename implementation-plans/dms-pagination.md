# Actions

REST API:
- GET messages via cursor (after & before) & limit

Sockets:
- Send updates for new messages, message updates and messages deleted
  - Q: Should I restrict it to only sendd updates for update and delete of messages that are displayed on my screen? -> What if there are updates for 100 messages that are not even shown on my screen?
