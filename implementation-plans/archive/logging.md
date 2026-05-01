# Implementation plans

Final outcome:
- Log server uptime, request time
- Log errors
- Implement audit logs:
  - login success/fail
  - access denied
  - role changes
  - message delete/edit
  - invite create/revoke

# Steps

- Install pino & pino-http
- Initialise pino
- Implement httpLogger middleware
  - use it in app
  -> test it
- Implement loggin in error handling middleware
  - send back status with requestId from pino-http

Audits:
- Create an audit function with specific Audit events
- How to implement audit logs? (TODO: research)

Notes:
- In dev -> use pino-pretty, in prod -> don't use pino-pretty (instead JSON formatted logs to make them searchable)