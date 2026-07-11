import { Router } from "express";
import restaurantRouter from "./routes/reastaurant_routes";
import authRouter from "./routes/auth_routes";
import subscriptionRouter from "./routes/subscription_routes";
import productRouter from "./routes/product_routes";
import orderRouter from "./routes/order_routes";
import employeeRouter from "./routes/employee_routes";
import categoryRouter from "./routes/category_routes";

const router = Router();
router.use("/auth", authRouter);
router.use("/restaurants", restaurantRouter);
router.use("/subscription-plans", subscriptionRouter);
router.use("/products", productRouter);
router.use("/orders", orderRouter);
router.use("/employees", employeeRouter);
router.use("/categories", categoryRouter);
export default router;
