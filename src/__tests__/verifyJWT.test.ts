import verifyJWT, { UserRequest } from "../middleware/verifyJWT";
import jwt from "jsonwebtoken";

vi.mock("jsonwebtoken");

describe("verifyJWT", () => {
  let req: Partial<UserRequest>;
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      sendStatus: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("should return 401 if token is missing in header", () => {
    verifyJWT(req as UserRequest, res, next);

    expect(res!.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 when token is invalid", () => {
    (jwt.verify as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_t, _s, cb: any) => cb(new Error("bad token"), undefined)
    );

    req.headers!.authorization = "Bearer unvalid_token";
    verifyJWT(req as UserRequest, res, next);

    expect(res!.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("should run next() on successful token verification", () => {
    (jwt.verify as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_t, _s, cb: any) => cb(null, { UserInfo: { userId: 123 } })
    );

    req.headers = { authorization: "Bearer goodToken" };
    verifyJWT(req as UserRequest, res, next);

    expect(req.userId).toBe(123);
    expect(next).toHaveBeenCalled();
  });
});
