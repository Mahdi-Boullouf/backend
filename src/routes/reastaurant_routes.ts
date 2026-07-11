import { Router } from "express";
import {
    createRestaurant,
    createRestaurantSchema,
    getAllRestaurants,
    getRestaurant,
    getMyRestaurant,
    updateMyRestaurant,
    assignSubscription,
    assignSubscriptionSchema,
} from "../controllers/restaurant_controller";
import { validate } from "../middlewares/validate";
import { isLoggedInAsAdmin, isLoggedInAsOwner } from "../middlewares/auth";
import { uploadMiddleware } from "../middlewares/upload";

const restaurantRouter = Router();

restaurantRouter.post("/", isLoggedInAsAdmin, validate(createRestaurantSchema), createRestaurant);
restaurantRouter.get("/", isLoggedInAsAdmin, getAllRestaurants);

// Registered before "/:id" so "me" isn't swallowed as an :id param.
restaurantRouter.get("/me", isLoggedInAsOwner, getMyRestaurant);
restaurantRouter.patch("/me", isLoggedInAsOwner, uploadMiddleware.single("logo"), updateMyRestaurant);

restaurantRouter.get("/:id", getRestaurant);
restaurantRouter.patch("/:id/subscription", isLoggedInAsAdmin, validate(assignSubscriptionSchema), assignSubscription);

export default restaurantRouter;
