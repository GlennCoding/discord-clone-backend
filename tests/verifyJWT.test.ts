import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import verifyJWT, { UserRequest } from "../src/middleware/verifyJWT";
import getEnvVar from "../src/utils/getEnvVar";

jest.mock("jsonwebtoken");
jest.mock("../src/utils/getEnvVar");

const mockGetEnvVar = getEnvVar as jest.Mock;
mockGetEnvVar.mockReturnValue("test_secret");

describe("verifyJWT middleware", () => {
  let mockRequest: Partial<UserRequest>;
  let mockResponse: Partial<Response>;
  const nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      sendStatus: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return 401 if Authorization header is missing", () => {
    mockRequest.headers = {};
    verifyJWT(mockRequest as UserRequest, mockResponse as Response, nextFunction);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('should return 401 if Authorization header does not start with "Bearer "', () => {
    mockRequest.headers = { authorization: "Token 12345" };
    verifyJWT(mockRequest as UserRequest, mockResponse as Response, nextFunction);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should return 403 if token is invalid", () => {
    mockRequest.headers = { authorization: "Bearer invalidtoken" };
    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(new Error("Invalid token"), null);
    });
    verifyJWT(mockRequest as UserRequest, mockResponse as Response, nextFunction);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should return 403 if token payload is missing UserInfo", () => {
    mockRequest.headers = { authorization: "Bearer validtoken" };
    const decodedPayload = { user: "test" };
    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(null, decodedPayload);
    });
    verifyJWT(mockRequest as UserRequest, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: "Missing user info in token",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should call next() and attach userId to request if token is valid", () => {
    mockRequest.headers = { authorization: "Bearer validtoken" };
    const decodedPayload = { UserInfo: { userId: "12345" } };
    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(null, decodedPayload);
    });

    verifyJWT(mockRequest as UserRequest, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.userId).toBe("12345");
  });
});