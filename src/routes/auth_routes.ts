import { Router } from "express";
import { login, loginSchema } from "../controllers/auth_controller";
import { validate } from "../middlewares/validate";

const authRouter = Router();

authRouter.post("/login", validate(loginSchema), login);

export default authRouter;
