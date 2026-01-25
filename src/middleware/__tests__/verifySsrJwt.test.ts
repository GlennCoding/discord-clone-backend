import jwt from "jsonwebtoken";

import { SSR_ACCESS_TOKEN_COOKIE_NAME } from "../../config/tokenCookies";
import verifySsrJwt from "../verifySsrJwt";

vi.mock("jsonwebtoken");

describe("verifySsrJwt", () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = { headers: {}, cookies: {} };
    res = {
      sendStatus: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("returns 401 when token is missing", () => {
    verifySsrJwt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when token is invalid", () => {
    (jwt.verify as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_t, _s, cb: any) => cb(new Error("bad token"), undefined)
    );

    req.cookies = { [SSR_ACCESS_TOKEN_COOKIE_NAME]: "invalid_token" };
    verifySsrJwt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.userId and calls next() on success", () => {
    (jwt.verify as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_t, _s, cb: any) => cb(null, { UserInfo: { userId: 123 } })
    );

    req.cookies = { [SSR_ACCESS_TOKEN_COOKIE_NAME]: "goodToken" };
    verifySsrJwt(req, res, next);

    expect(req.userId).toBe(123);
    expect(next).toHaveBeenCalled();
  });
});

