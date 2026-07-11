import { Router } from "express";
import { getSubscriptionPlans } from "../controllers/subscription_controller";

const subscriptionRouter = Router();

subscriptionRouter.get("/", getSubscriptionPlans);

export default subscriptionRouter;
