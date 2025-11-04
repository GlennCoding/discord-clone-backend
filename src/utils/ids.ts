import { randomBytes } from "crypto";

const SHORT_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHORT_ID_LENGTH = 6;

export const randomShortId = () => {
  const bytes = randomBytes(SHORT_ID_LENGTH);
  let out = "";
  for (let i = 0; i < SHORT_ID_LENGTH; i += 1) {
    out += SHORT_ID_CHARS[bytes[i] % SHORT_ID_CHARS.length];
  }
  return out;
};
