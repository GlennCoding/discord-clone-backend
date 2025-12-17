# Architecture

Models
- User 
- Session (skip for now)
  - id, userId, tokenHash, is_revoked, device_id, parent_token_id, expires_at

Flows:
- /register 
  - [ ] Issue SSR token
- /login 
  - [ ] Issue SSR token 
- /refresh
  - [ ] Issue SSR token if requested
- /logout
  - [ ] Remove SSR token from 

- auth Middleware 
  - Behaviour: Have option to add SSR opening

SSR token:
- name: ssr_access_token

# TODOs

- Issue SSR token
  - Where? -> login & register