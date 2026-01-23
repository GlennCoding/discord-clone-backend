# Bugs

- Images not loaded after restarting gcs-emulator
- design: no image preview in frontend
- design: no proper styling for images in messages
- Self-sent file messages show up on the wrong side (because they have the "other" label)
  - api: Need to change DTO to not have sender: "other" | "self"
- Check that not multiple files are uploaded in the BE
- Add FE error toast when you try to upload a too large file

### Final interactions:

- You select image
  - Error: Too large file selectec -> error toast
  - Image Preview + Click X to remove
- Sending image
  - Image gets inserted into message list (but with "sending..." status)
  - On error -> Show "Error, try again"
- Broadcasted image

### Next steps:
- [ ] Improve MessageDTO by having senderID in it 
  - ~~BE: Change MessageDTO, create toMessageDTO function, implement it in chatHandler and messageController~~
  - FE: Change MessageDTO in FE and update MessageBySelf & MessageByOther component
- [ ] BE: Add validation that you didn't upload multiple files (at this point)
- [ ] FE improvements
  - For now, only allow images
  - Add proper styling for messages with attachments
  - Add image preview
  - Add FE validator for too big file size -> Make a toast pop up when file is too big

### Frontend next steps:
Change MessageDTO in FE and update MessageBySelf & MessageByOther component:
- How to handle knowing what my current userId is -> When loading chat, send with it the your and others userIds?
- Should I save my userId in localstorage?
- When do I receive my userId?
  1. When logging in -> Immediately save userId?
     - Save it to a global context (use Zustand) & localstorage
     - Have a hook to access it
  2. On hard reload
     - Load from localstorage + call /me to get current state (user object might have changed)
- Add /me to BE
  - return {userId, username, avatarUrl}

Implementation plan:
- ~~BE: send userData on login or via /me~~
  - ~~Write test for /me~~
    - Should give me MeDTO data
    - Should throw 401 if I don't send token
- FE (context): 
  - Have a context wrapping around the app (app/layout)
    - Via Zusand, saves to localStorage
  - Have a hook that gives you userId
    - If userId === undefined fill with localstorage & in backround fetch /me to silently update userData
- FE components/pages using userData:
  - Use hook -> Hook returns you userData object or undefined 
  - Q: Should it indicate when it's loading its data?
    - Or should I have it undefined and within the hook it throws a toast error when somethin went wrong

Flow:
- FE reload page -> asks useMeHook() for userData
- useMeHook() gets data from localStorage & fetches in background /me
  - error: -> retry? -> (failing again) -> Leave /me and try on next reload
  - success: set userData & localStorage to response body
- FE
  - userData -> undefined: Show loading on profile avatar & username

Edge case:
- Not loading /me, what to do?
  - Hydrate from localStorage, update again when logging in or loading profile
  - Alert useMeHook that fetching failed (useSate error) -> Save it to it's state
    - Next time useMeHook is being used, try to fetch again
- How to handle refresh?
  - When you get a new auth token, use it to load /me
