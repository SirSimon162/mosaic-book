import { sendFail } from "../lib/api-response.js";
import { Status } from "../lib/http-code.js";
import AppError from "../lib/http-error.js";
import { type ErrorRequestHandler } from "express";

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return sendFail(res, err.statusName, err.message);
  }

  console.error(err);
  return sendFail(res, Status.INTERNAL_SERVER_ERROR, "Internal Server Error");
};

export default errorHandler;
