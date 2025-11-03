import { Response } from "supertest";

export const expectNotFound = ({ status, body }: Response) => {
  expect(status).toBe(404);
  expect(body.error).toBeDefined();
};

export const expectBadRequest = ({ status, body }: Response) => {
  expect(status).toBe(400);
  expect(body.error).toBeDefined();
};

export const expectForbidden = ({ status, body }: Response) => {
  expect(status).toBe(403);
  expect(body.error).toBeDefined();
};

export const expectUnauthorized = ({ status, body }: Response) => {
  expect(status).toBe(401);
  expect(body.error).toBeDefined();
};
