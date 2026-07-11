import { NextFunction, Request, Response } from "express";
import { AppError } from "../helpers/error";
import { isSubscriptionActive } from "../helpers/subscription";
import { resolveRestaurantForActor } from "../helpers/actor";
import jwt, { JwtPayload } from "jsonwebtoken";

const verifyToken = (req: Request): JwtPayload => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        throw new AppError("You are not logged in", 401);
    }
    const token = header.split("Bearer ")[1];
    try {
        return jwt.verify(token, process.env.JWT!) as JwtPayload;
    } catch (error) {
        throw new AppError("Invalid token", 401);
    }
};

export const isLoggedInAsUser = (req: Request, res: Response, next: NextFunction) => {
    req.user = verifyToken(req);
    next();
};

export const isLoggedInAsAdmin = (req: Request, res: Response, next: NextFunction) => {
    const decoded = verifyToken(req);
    if (decoded.role !== "ADMIN") {
        throw new AppError("You are not authorized", 401);
    }
    req.user = decoded;
    next();
};

// Owner routes are locked out entirely once the restaurant's subscription has lapsed.
export const isLoggedInAsOwner = async (req: Request, res: Response, next: NextFunction) => {
    const decoded = verifyToken(req);
    if (decoded.role !== "OWNER") {
        throw new AppError("You are not authorized", 401);
    }

    const restaurant = await resolveRestaurantForActor(decoded.id, decoded.role);
    if (!isSubscriptionActive(restaurant)) {
        throw new AppError("Your subscription has expired. Contact the admin to renew.", 403);
    }

    req.user = decoded;
    req.restaurantId = restaurant!.id;
    next();
};

// Chef and payment-agent share the same dashboard; both are locked out once the employer's subscription lapses.
export const isLoggedInAsStaff = async (req: Request, res: Response, next: NextFunction) => {
    const decoded = verifyToken(req);
    if (decoded.role !== "CHEF" && decoded.role !== "PAYMENTAGENT") {
        throw new AppError("You are not authorized", 401);
    }

    const restaurant = await resolveRestaurantForActor(decoded.id, decoded.role);
    if (!isSubscriptionActive(restaurant)) {
        throw new AppError("Your restaurant's subscription has expired. Contact the admin to renew.", 403);
    }

    req.user = decoded;
    req.restaurantId = restaurant!.id;
    next();
};

// Live-orders endpoints: owner + chef + payment-agent all share the same real-time queue for their restaurant.
export const isLoggedInAsOwnerOrStaff = async (req: Request, res: Response, next: NextFunction) => {
    const decoded = verifyToken(req);
    if (!["OWNER", "CHEF", "PAYMENTAGENT"].includes(decoded.role as string)) {
        throw new AppError("You are not authorized", 401);
    }

    const restaurant = await resolveRestaurantForActor(decoded.id, decoded.role);
    if (!isSubscriptionActive(restaurant)) {
        throw new AppError("Your subscription has expired. Contact the admin to renew.", 403);
    }

    req.user = decoded;
    req.restaurantId = restaurant!.id;
    next();
};
