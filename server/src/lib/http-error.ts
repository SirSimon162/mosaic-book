import { StatusCodes, type StatusCodeName } from "./http-code.js";

export default class AppError extends Error {
  public readonly statusName: StatusCodeName;
  public readonly statusCode: number;

  constructor(message: string, statusName: StatusCodeName) {
    super(message);
    this.name = "AppError";
    this.statusName = statusName;
    this.statusCode = StatusCodes[statusName];
    Error.captureStackTrace(this, this.constructor);
  }
}
