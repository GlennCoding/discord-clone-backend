# STRIDE Threat Model – Chat Application

## 1. Scope & Objectives

This threat model analyzes the security risks of a Discord-like real-time chat application using the STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

Goals:

- Identify realistic threats across HTTP APIs, Socket.IO, persistence, and media handling
- Evaluate current mitigations
- Define a secure target state aligned with planned features
- Prioritize remaining risks

---

## 2. System Overview

### Architecture

- Frontend: Next.js (same origin as API)
- Backend: Single Node.js / Express service
- Realtime: Socket.IO
- Database: MongoDB Atlas
- Cache / Rate limit store: Redis
- File storage: Google Cloud Storage (attachments served from separate domain)
- Deployment: Render

### Authentication & Authorization

- Access tokens: JWT (15 min)
- Refresh tokens: 7 days
- Tokens stored in Secure, HttpOnly, SameSite=Lax cookies
- Cookies only (no Authorization header)
- CSRF tokens required for all state-changing HTTP requests
- Authorization enforced in service layer via DB checks (immediate revocation requirement)

---

## 3. Assets

| **Asset**                | **Description**              |
| ------------------------ | ---------------------------- |
| User accounts            | Credentials, identity, roles |
| Auth tokens              | Access & refresh tokens      |
| Messages                 | Text content, metadata       |
| Attachments              | Uploaded images              |
| Roles & permissions      | Channel/chat access rules    |
| Audit & application logs | Security-relevant events     |
| Database                 | MongoDB collections          |
| Infrastructure secrets   | JWT secrets, DB credentials  |

---

## 4. Trust Boundaries

1. Browser ↔ Backend (HTTP)
2. Browser ↔ Backend (Socket.IO)
3. Backend ↔ MongoDB Atlas
4. Backend ↔ Redis
5. Backend ↔ GCS
6. User ↔ Attachment delivery domain
7. Admin ↔ Logs / Infrastructure

Each boundary is crossed by authenticated or unauthenticated data and is evaluated independently.

---

## 5. Assumptions & Security Invariants

- User-generated content is rendered as plain text only
- No markdown, HTML, or SVG rendering
- Frontend and API share the same origin
- Socket.IO re-authenticates on connection/reconnection
- Access token expiry forces socket re-authentication
- Attachments are images only
- Authorisation decisions are not trusted from JWT claims alone
- MongoDB queries are server-constructed only

---

## 6. STRIDE Analysis

### 6.1 Spoofing Identity

Threats

- Token theft via XSS or database compromise
- Refresh token reuse
- Session hijacking via leaked cookies
- Socket connection impersonation

Current Mitigations

- HttpOnly, Secure cookies
- Short-lived access tokens
- Refresh token rotation, hashed refreshed tokens in DB
- Login rate limiting
- Socket authentication via cookies
- Sender identity derived from server context (req.userId)

Gaps / Risks

- No multi-device session visibility
- No 2FA

Target-State Mitigations

- Token family + reuse detection
- “Logout all sessions”

---

### 6.2 Tampering

Threats

- Modifying message sender, chatId, or permissions
- Unauthorised message injection
- Manipulating socket events
- Query manipulation (NoSQL injection)

Current Mitigations

- Sender always derived from authenticated context
- Membership checks before every action
- Server-constructed MongoDB queries
- strictQuery, sanitizeFilter
- Zod strict validation
- Operator allowlisting

Residual Risk

- Future feature expansion (search, advanced filters)
- Accidental over-population of MongoDB documents

Target-State Mitigations

- Explicit .select() on populate
- Centralised authorisation helpers
- Socket event schema validation

---

### 6.3 Repudiation

Threats

- Users denying actions (message sent, role changed)
- Inability to trace malicious behaviour
- Lack of forensic evidence after incidents

Current Mitigations

- HTTP request logs (stdout)
- Audit event logging (stdout)

Gaps

- Dedicated audit log collection

Target-State Mitigations

- Dedicated audit log collection & logging platform

---

### 6.4 Information Disclosure

Threats

- Unauthorised access to messages or chats (IDOR)
- Attachment URL leakage
- Token leakage via logs
- Database compromise
- Attachment content sniffing

Current Mitigations

- Chat access scoped by participants
- Random attachment object keys
- Separate attachment domain (bucket)
- Attachments signed with short TTL
- CSP, nosniff, helmet
- No inline SVG or HTML

Gaps

- No DB backups yet (because not needed)

Target-State Mitigations

- Atlas encrypted backups
- Least-privilege DB users

---

### 6.5 Denial of Service (DoS)

Threats

- HTTP request flooding
- Socket connection floods
- Message fan-out amplification
- Large file uploads
- Expensive MongoDB queries

Current Mitigations

- Redis-backed rate limiting
- JSON body size limits
- Multer file-size limits
- Per-user socket rate limiting

Gaps

- No background job queue
- No circuit breakers yet
- Limited socket abuse detection (didn’t name sockets yet, no audit logging for sockets yet)

Target-State Mitigations

- Socket event quotas
- Circuit breakers for expensive DB queries
- Background processing for uploads
- Cloudflare (WAF, bot protection)

---

### 6.6 Elevation of Privilege

Threats

- Role escalation via forged claims
- Bypassing authorisation checks
- Stale permissions after role changes

Current Mitigations

- No role claims trusted in JWT
- Authorisation enforced via DB in services
- Immediate revocation supported

Residual Risk

- Developer error in new endpoints
- Performance pressure leading to skipped checks

Target-State Mitigations

- Centralised RBAC helpers
- Redis-cached permission checks (short TTL)
- Authorisation tests for every endpoint

---

## 7. Threat Scenarios (Examples)

1. Malicious chat member
    - Attempts to access other chats by guessing IDs
    - Blocked by participant scoping
1. Compromised database
    - Plaintext refresh tokens allow session takeover
    - Mitigated in target state via hashing
1. Attachment link sharing
    - User leaks image URL
    - Mitigated via signed URLs + TTL
1. Socket spam
    - User floods message:send
    - Mitigated via per-user socket rate limits

---

## 8. Mitigation Backlog 

High Priority

1. Enable Atlas backups
2. Socket event schema validation

Medium Priority

1. Centralised RBAC helpers
2. JWT signing key rotation
3. Circuit breakers for DB queries
4. Background job queue

Low Priority

1. Virus scanning for attachments
2. 2FA
3. Advanced anomaly detection
