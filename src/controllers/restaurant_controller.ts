import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../helpers/error";
import { isSubscriptionActive } from "../helpers/subscription";

export const createRestaurantSchema = z.object({
    name: z.string().min(2),
    ownerEmail: z.email(),
    ownerPassword: z.string().min(6),
});

export const assignSubscriptionSchema = z.object({
    subscriptionPlanId: z.string(),
});

// Admin: create a restaurant together with its owner account, starting a 15-day free trial.
export const createRestaurant = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { name, ownerEmail, ownerPassword } = request.body;

        const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
        if (existingUser) {
            throw new AppError("A user with this email already exists", 400);
        }

        const trialPlan = await prisma.subscription.findFirst({ where: { isTrial: true } });
        if (!trialPlan) {
            throw new AppError("No trial plan is configured", 500);
        }

        const hashedPassword = await bcrypt.hash(ownerPassword, 10);
        const now = new Date();
        const trialEndAt = new Date(now.getTime() + trialPlan.days * 24 * 60 * 60 * 1000);

        const restaurant = await prisma.$transaction(async (tx) => {
            const owner = await tx.user.create({
                data: { email: ownerEmail, password: hashedPassword, role: "OWNER" },
            });

            return tx.restaurant.create({
                data: {
                    name,
                    memeberId: owner.id,
                    subscriptionPlanId: trialPlan.id,
                    subscriptionStartAt: now,
                    subscriptionEndAt: trialEndAt,
                },
                include: { memeber: { select: { id: true, email: true, role: true } }, subscriptionPlan: true },
            });
        });

        response.status(201).json({ success: true, data: restaurant });
    } catch (error) {
        next(error);
    }
};

// Admin: list every restaurant with owner + subscription info.
export const getAllRestaurants = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const restaurants = await prisma.restaurant.findMany({
            include: { memeber: { select: { id: true, email: true, role: true } }, subscriptionPlan: true },
            orderBy: { createdAt: "desc" },
        });
        response.json({ success: true, data: restaurants });
    } catch (error) {
        next(error);
    }
};

// Public: restaurant info + available menu (used by the ordering flow). Only served while the subscription is active.
export const getRestaurant = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;

        const restaurant = await prisma.restaurant.findUnique({
            where: { id },
            include: {
                subscriptionPlan: true,
                categories: { orderBy: { position: "asc" } },
                products: {
                    where: { isAvailable: true },
                    include: { modifierGroups: { include: { options: true } } },
                    orderBy: { name: "asc" },
                },
            },
        });
        if (!restaurant) {
            throw new AppError("Restaurant not found", 404);
        }

        if (!isSubscriptionActive(restaurant)) {
            throw new AppError("This restaurant is not currently accepting orders", 403);
        }

        response.json({
            success: true,
            data: {
                id: restaurant.id,
                name: restaurant.name,
                logo: restaurant.logo,
                description: restaurant.description,
                categories: restaurant.categories,
                products: restaurant.products,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Owner: get their own restaurant's profile.
export const getMyRestaurant = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const restaurant = await prisma.restaurant.findUnique({ where: { id: request.restaurantId! } });
        response.json({ success: true, data: restaurant });
    } catch (error) {
        next(error);
    }
};

// Owner: update their own restaurant's logo and/or bio.
export const updateMyRestaurant = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const file = request.file as Express.Multer.File | undefined;
        const data: { logo?: string; description?: string } = {};
        if (file) data.logo = `/uploads/${file.filename}`;
        if (typeof request.body.description === "string") data.description = request.body.description;

        const updated = await prisma.restaurant.update({ where: { id: request.restaurantId! }, data });
        response.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// Admin: assign/renew a restaurant's subscription plan (start = now, end = now + plan.days).
export const assignSubscription = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;
        const { subscriptionPlanId } = request.body;

        const restaurant = await prisma.restaurant.findUnique({ where: { id } });
        if (!restaurant) {
            throw new AppError("Restaurant not found", 404);
        }

        const plan = await prisma.subscription.findUnique({ where: { id: subscriptionPlanId } });
        if (!plan) {
            throw new AppError("Subscription plan not found", 404);
        }

        const now = new Date();
        const endAt = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);

        const updated = await prisma.restaurant.update({
            where: { id },
            data: { subscriptionPlanId: plan.id, subscriptionStartAt: now, subscriptionEndAt: endAt },
            include: { subscriptionPlan: true },
        });

        response.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
