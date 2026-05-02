import jwt from "jsonwebtoken";

import { ACCESS_TOKEN_COOKIE_NAME } from "../../config/tokenCookies";
import { InvalidToken, TokenMissingError } from "../../utils/errors";
import verifyJWT from "../verifyJWT";

import type { UserRequest } from "../verifyJWT";

vi.mock("jsonwebtoken");

describe("verifyJWT", () => {
  let req: Partial<UserRequest>;
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = { headers: {}, cookies: {}, socket: { remoteAddress: "127.0.0.1" }, get: vi.fn() } as any;
    res = {
      sendStatus: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("should call next with TokenMissingError if token is missing in cookies", () => {
    verifyJWT(req as UserRequest, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(TokenMissingError));
  });

  it("should call next with InvalidToken when token is invalid", () => {
    (jwt.verify as unknown as ReturnType<typeof vi.fn>).mockImplementation((_t, _s, cb: any) =>
      cb(new Error("bad token"), undefined),
    );

    req.cookies = { [ACCESS_TOKEN_COOKIE_NAME]: "invalid_token" };
    verifyJWT(req as UserRequest, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(InvalidToken));
  });

  it("should run next() on successful token verification", () => {
    (jwt.verify as unknown as ReturnType<typeof vi.fn>).mockImplementation((_t, _s, cb: any) =>
      cb(null, { UserInfo: { userId: 123 } }),
    );

    req.cookies = { [ACCESS_TOKEN_COOKIE_NAME]: "goodToken" };
    verifyJWT(req as UserRequest, res, next);

    expect(req.userId).toBe(123);
    expect(next).toHaveBeenCalled();
  });
});
