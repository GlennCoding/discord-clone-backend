# Bugs

- Images not loaded after restarting gcs-emulator
- design: no image preview in frontend
- design: no proper styling for images in messages
- Self-sent file messages show up on the wrong side (because they have the "other" label)
  - api: Need to change DTO to not have sender: "other" | "self"
- Check that not multiple files are uploaded in the BE
- Add FE error toast when you try to upload a too large file

Final interactions:

- You select image
  - Error: Too large file selectec -> error toast
  - Image Preview + Click X to remove
- Sending image
  - Image gets inserted into message list (but with "sending..." status)
  - On error -> Show "Error, try again"
- Broadcasted image