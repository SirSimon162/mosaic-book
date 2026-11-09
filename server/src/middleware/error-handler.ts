import { sendFail } from "../lib/api-response.js";
import { Status } from "../lib/http-code.js";
import AppError from "../lib/http-error.js";
import { type ErrorRequestHandler } from "express";

function isPayloadTooLarge(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.too.large"
  );
}

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (isPayloadTooLarge(err)) {
    return sendFail(res, Status.PAYLOAD_TOO_LARGE, "Request body is too large");
  }

  if (err instanceof AppError) {
    return sendFail(res, err.statusName, err.message);
  }

  console.error(err);
  return sendFail(res, Status.INTERNAL_SERVER_ERROR, "Internal Server Error");
};

export default errorHandler;
