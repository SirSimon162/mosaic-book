import { Response } from "express";
import { StatusCodes, StatusCodeName } from "./http-code.js";

interface ApiSuccess<T> {
  success: true;
  result: T;
}

interface ApiFailure {
  success: false;
  error: string;
}

export function sendSuccess<T>(res: Response, name: StatusCodeName, result: T) {
  return res
    .status(StatusCodes[name])
    .json({ success: true, result } satisfies ApiSuccess<T>);
}
export function sendFail(res: Response, name: StatusCodeName, message: string) {
  return res
    .status(StatusCodes[name])
    .json({ success: false, error: message } satisfies ApiFailure);
}
