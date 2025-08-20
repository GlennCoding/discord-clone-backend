import getEnvVar from "../utils/getEnvVar";

describe("getEnvVar", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules(); // Most important - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  it("should return the value of an existing environment variable", () => {
    process.env.TEST_VAR = "test_value";
    expect(getEnvVar("TEST_VAR")).toBe("test_value");
  });

  it("should throw an error for a missing environment variable", () => {
    expect(() => getEnvVar("MISSING_VAR")).toThrow(
      "Missing environment variable: MISSING_VAR"
    );
  });
});
