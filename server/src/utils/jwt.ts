import jwt from "jsonwebtoken";
import { environment } from "../config/index.js";
import { AccessTokenPayload } from "../modules/auth/auth.types.js";

export const createAccessToken = (data: AccessTokenPayload) => {
  return jwt.sign(data, environment.JWT_SECRET, {
    expiresIn: environment.JWT_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, environment.JWT_SECRET) as AccessTokenPayload;
};
