import express, { type Router } from "express";
import { loginSchema, registerSchema } from "./auth.types.js";
import { registerUser, loginUser } from "./auth.service.js";
import { setAuthCookie, createAccessToken, clearAuthCookie } from "../../utils/index.js";
import { sendSuccess, sendFail } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";

const authRoutes: Router = express.Router();

authRoutes.post("/register", async (req, res) => {
  const input = registerSchema.safeParse(req.body);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const user = await registerUser(input.data);
  const token = createAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  setAuthCookie(res, token);
  return sendSuccess(res, Status.CREATED, user);
});

authRoutes.post("/login", async (req, res) => {
  const input = loginSchema.safeParse(req.body);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const user = await loginUser(input.data);
  const token = createAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  setAuthCookie(res, token);
  return sendSuccess(res, Status.OK, user);
});

authRoutes.post("/logout", async (req, res)=>{
  clearAuthCookie(res);
  return sendSuccess(res, Status.OK, null)
})

export default authRoutes;
