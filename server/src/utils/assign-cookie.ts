import { environment } from "../config/index.js";
import { Response } from "express";

export const AUTH_COOKIE = "token";
export const AUTH_COOKIE_MAX_AGE = environment.JWT_EXPIRES_IN * 1000;
export const AUTH_COOKIE_SECURE = environment.SECURE;
export const AUTH_COOKIE_SAME_SITE = "lax";

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: AUTH_COOKIE_SECURE,
    sameSite: AUTH_COOKIE_SAME_SITE,
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
};


export function clearAuthCookie(res: Response){
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: AUTH_COOKIE_SECURE,
    sameSite: AUTH_COOKIE_SAME_SITE
  });
}