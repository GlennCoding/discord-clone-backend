export class CustomError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UserNotFoundError extends CustomError {
  constructor(userName?: string) {
    super(
      404,
      userName ? `User with username "${userName}" not found` : "User not found"
    );
  }
}

export class ChatNotFoundError extends CustomError {
  constructor() {
    super(404, `Chat not found`);
  }
}

export class InvalidCredentialsError extends CustomError {
  constructor() {
    super(401, "Invalid username or password");
  }
}

export class RefreshtokenNotFoundError extends CustomError {
  constructor() {
    super(404, "Refreshtoken not found");
  }
}

export class RequestBodyIsMissingError extends CustomError {
  constructor() {
    super(400, "Request body is missing");
  }
}

export class ParamsMissingError extends CustomError {
  constructor(inputName: string) {
    super(400, `The parameter ${inputName} is required`);
  }
}

export class InputMissingError extends CustomError {
  constructor(inputName: string) {
    super(400, `${inputName} is required`);
  }
}

export class CantStartChatWithOneselfError extends CustomError {
  constructor() {
    super(400, "You can't start a chat with yourself");
  }
}

export class UserNotPartOfChatError extends CustomError {
  constructor() {
    super(403, "You're not part of this chat");
  }
}

export class UsernameIsTakenError extends CustomError {
  constructor() {
    super(409, "Username is already taken");
  }
}
