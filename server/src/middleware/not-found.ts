import AppError from "../lib/http-error.js";
import { Status } from "../lib/http-code.js";
import { type RequestHandler } from "express";

const notFound: RequestHandler = (req, res, next) => {
  next(new AppError("Not Found", Status.NOT_FOUND));
};

export default notFound;
