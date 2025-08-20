export class CustomError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UserNotFoundError extends CustomError {
  constructor(userName: string) {
    super(404, `User with username "${userName}" not found`);
  }
}

export class InvalidCredentialsError extends CustomError {
  constructor() {
    super(401, "Invalid username or password");
  }
}
