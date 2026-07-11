import { Router } from "express";
import {
    createOrder,
    createOrderSchema,
    getMyOrders,
    updateOrderStatus,
    updateOrderStatusSchema,
    getLiveOrders,
    updateOrderFlags,
    updateOrderFlagsSchema,
} from "../controllers/order_controller";
import { validate } from "../middlewares/validate";
import { isLoggedInAsOwner, isLoggedInAsOwnerOrStaff } from "../middlewares/auth";

const orderRouter = Router();

orderRouter.post("/", validate(createOrderSchema), createOrder);
orderRouter.get("/", isLoggedInAsOwner, getMyOrders);
orderRouter.patch("/:id/status", isLoggedInAsOwner, validate(updateOrderStatusSchema), updateOrderStatus);

// Live queue: shared by the owner and their chef/payment-agent staff.
orderRouter.get("/live", isLoggedInAsOwnerOrStaff, getLiveOrders);
orderRouter.patch("/:id/flags", isLoggedInAsOwnerOrStaff, validate(updateOrderFlagsSchema), updateOrderFlags);

export default orderRouter;
