## STRIDE Threat Model

The Discord Clone backend exposes a REST API plus Socket.IO events that allow users to authenticate, manage servers/channels, and exchange chat messages with attachments stored on a GCS-compatible bucket. The following STRIDE analysis captures key assets, abuse scenarios, and current/desired mitigations.

### Trust Boundaries

The system contains several trust boundaries:

- Between unauthenticated users and the backend.
- Between authenticated users and backend services.
- Between the backend application and MongoDB.
- Between the backend application and object storage (GCS-compatible bucket).
- Between REST-based authentication and persistent WebSocket connections.

Crossing these boundaries without proper controls introduces security risks.

### Assets Requiring Protection

The primary assets requiring protection are:

| Asset | Description |
| --- | --- |
| User credentials | Password hashes and refresh tokens. |
| Authentication tokens | JWT access and refresh tokens. |
| Messages | Private user communications. |
| Chat metadata | Server/channel membership and identifiers. |
| User identity | Usernames, profile status, and avatars. |
| Stored media | Message attachments and profile images. |
| System availability | Continuous real-time messaging. |

### Spoofing Identity

| Assets / Entry Points | Threats | Current Mitigations | Gaps / Recommendations |
| --- | --- | --- | --- |
| Access & refresh tokens, `/login`, `/refresh`, socket handshake (`verifySocketJWT`) | Stolen cookies used from another origin/device; attacker crafts a forged JWT; socket clients skip membership checks to join arbitrary rooms. | HTTP-only cookies, JWT signing with strong secrets, middleware validation for HTTP & sockets. | Enforce rotating refresh tokens with binding to user agent/IP; add short-lived socket session tokens to limit replay; audit socket handlers to re-check membership (e.g., `message:send`). |
| Invitation short IDs (`/server/:shortId/join`) | Guessing short IDs to join private servers. | Random 6-char alphanumeric short IDs. | Increase entropy or allow owner-controlled expiration; rate-limit join attempts per IP. |

### Tampering

| Assets / Entry Points | Threats | Current Mitigations | Gaps / Recommendations |
| --- | --- | --- | --- |
| MongoDB documents (Server, Channel, Message, Member) | Authenticated but unauthorized users modify server/channel settings or messages; replayed socket payloads mutate state. | `verifyJWT`, role checks inside controllers, `ensureServerOwner`, `ensureChannelAccess`. | Add optimistic locking or revision tracking for high-value updates; tighten socket handlers to validate payload schemas and authorization before writes. |
| File uploads (`/profile/avatar`, `/messages/attachment`) | Uploading malicious files or oversized payloads to exhaust storage; tampering with object names to delete other users’ files. | Multer size limits, MIME validation, server-generated object keys, deletion restricted to message sender. | Scan attachments for malware if exposed to clients; sign storage URLs when exposing downloads; log deletion attempts. |

### Repudiation

| Assets / Entry Points | Threats | Current Mitigations | Gaps / Recommendations |
| --- | --- | --- | --- |
| API actions (server edits, message posting/deletion) | Users deny creating/deleting servers, channels, or messages; lack of traceability makes incident response difficult. | Minimal logging (console). | Introduce structured audit logs (user id, action, resource, timestamp) persisted centrally; propagate correlation IDs through API and socket flows. |
| Storage operations (avatar/message attachment deletions) | A user claims a file was removed by someone else. | Not tracked. | Record delete operations (user id, object key) and surface in an admin log. |

### Information Disclosure

| Assets / Entry Points | Threats | Current Mitigations | Gaps / Recommendations |
| --- | --- | --- | --- |
| HTTP/S responses, Socket.IO events | Over-broad DTOs leaking member lists or channel info to unauthorized clients; chat history accessible through missing membership checks. | DTO builders filter channels by roles; `ensureChannelAccess` restricts channel history. | Add defense-in-depth by checking permissions in socket join handlers; scrub sensitive fields (emails, hashed passwords) from populated documents. |
| Stored attachments / avatars on fake GCS | Public bucket URLs accessible without auth could leak private attachments. | Local emulator exposes HTTP endpoints; prod uses signed GCS bucket. | Require signed URLs or proxy downloads through the API; configure bucket ACLs to private and only expose time-limited tokens. |
| Cookies / tokens | Leakage via non-HTTPS transport or overly permissive `sameSite=false`. | Secure flag + lax same-site set only in production. | Enforce HTTPS locally with self-signed certificate or instruct devs to trust TLS proxies; revisit cookie policy so staging/dev also ship with `sameSite=lax`. |

### Denial of Service

| Assets / Entry Points | Threats | Current Mitigations | Gaps / Recommendations |
| --- | --- | --- | --- |
| HTTP endpoints (`/chat`, `/messages/attachment`) | Flood of large uploads, repeated authentication attempts, or message spam exhausts CPU/storage. | Multer file-size limits, bcrypt hashing (but still expensive), no rate limiting. | Add global & per-user rate limiting, circuit breakers for expensive DB queries, background processing for media uploads. |
| Socket namespaces | Attackers open many sockets or emit high-frequency events (e.g., `message:send`) to overwhelm the server. | None beyond default Socket.IO backpressure. | Implement authentication throttling and per-namespace rate limits; disconnect abusive clients automatically. |
| MongoDB / storage | Crafted queries or upload storms exhaust DB connections or disk. | Default driver pool; Docker volumes. | Monitor resource utilization, set quotas, and add auto-scaling alarms; validate query inputs to prevent unbounded scans. |

### Elevation of Privilege

| Assets / Entry Points | Threats | Current Mitigations | Gaps / Recommendations |
| --- | --- | --- | --- |
| Role / permission model | Chat members escalate to server admin by bypassing role checks or tampering with payloads. | `checkPermissionInRoles`, server ownership checks, `ensureServerOwner`. | Centralize authorization logic (policy layer) so every controller and socket handler reuses the same checks; add tests for negative cases (non-admin editing server). |
| Socket events without validation | Missing schema validation lets attackers craft payloads that trick handlers into running privileged operations. | Manual `ensureParam` usage in some handlers. | Adopt shared zod schemas for every event, and reject unexpected fields early. |
| Refresh token rotation | Single refresh token stored per user means logging in elsewhere overwrites prior sessions, but logout filtering assumes multiple tokens. | Save token array, overwrite on login. | Implement device-scoped tokens and revoke-by-id to prevent privilege confusion; protect refresh endpoint with additional device fingerprinting. |

## Next Steps 

1. **Add Centralized Logging & Monitoring** – Emit structured logs with request IDs, user IDs, and action context to detect spoofing/tampering attempts and support non-repudiation.
2. **Add Rate Limiting & Abuse Detection** – Apply per-IP and per-user throttles across REST and socket layers; integrate with a WAF or reverse proxy for coarse filtering.
3. **Add Secrets & Config Hardening** – Load JWT secrets, cookie domains, and storage credentials via a secrets manager; rotate them regularly.
4. **Implement Threat Scenario Testing** – Add automated tests (or chaos exercises) that simulate malformed socket payloads, file upload abuse, and permission bypass attempts to keep mitigations effective.
