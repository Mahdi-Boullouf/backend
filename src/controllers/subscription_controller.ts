import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";

export const getSubscriptionPlans = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const plans = await prisma.subscription.findMany({ orderBy: { days: "asc" } });
        response.json({ success: true, data: plans });
    } catch (error) {
        next(error);
    }
};
