import {environment} from "../config/index.js";
import { Response } from "express";

const AUTH_COOKIE = "token";
const AUTH_COOKIE_MAX_AGE = environment.JWT_EXPIRES_IN * 1000;
const AUTH_COOKIE_SECURE = environment.SECURE;
const AUTH_COOKIE_SAME_SITE = "lax";

export const setAuthCookie = (res: Response, token: string) => {
    res.cookie(AUTH_COOKIE, token, {
        httpOnly: true,
        secure: AUTH_COOKIE_SECURE,
        sameSite: AUTH_COOKIE_SAME_SITE,
        maxAge: AUTH_COOKIE_MAX_AGE,
    });
}
