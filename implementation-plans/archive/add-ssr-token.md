# Architecture

Models
- User 
- Session (skip for now)
  - id, userId, tokenHash, is_revoked, device_id, parent_token_id, expires_at

Flows:
- /register 
  - [x] Issue SSR token
- /login 
  - [x] Issue SSR token 
- /refresh
  - [x] Issue SSR token if requested
- /logout
  - [x] Remove SSR token from 

- [ ] auth Middleware 
  - Behaviour: Have option to add SSR opening

SSR token:
- name: ssr_access_token

# TODOs

- Issue SSR token
  - Where? -> login & register
    - Add cookie name & cookie options
    - Add setSsrAccessTokenCookie function
    - Add clearSsrAccessTokenCookie function
    - Add issueSsrAccessToken function
  - authController
    - Issue SSR token
  - registerController
    - Issue SSR token
  - refreshController?
    - Issue SSR token if requested
  - logout
    - Remove SSR tokens

- verifyJwt Middleware
  - prop: allowSsr 
    - if yes -> check for the ssr token, verify it and next()
    - if no -> check for the access token, verify it and next()
  - set verifyJWT({isSsr: true}) to all /api/ssr requests
  - set verifyJWT to all /api requests