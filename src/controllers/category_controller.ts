import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { AppError } from "../helpers/error";

export const createCategorySchema = z.object({
    name: z.string().min(1),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1),
});

// Owner: create a category for their own restaurant, appended to the end of the list.
export const createCategory = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { name } = request.body;

        const count = await prisma.category.count({ where: { restaurantId: request.restaurantId! } });
        const category = await prisma.category.create({
            data: { name, position: count, restaurantId: request.restaurantId! },
        });

        response.status(201).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

// Owner: list their own restaurant's categories, in display order.
export const getMyCategories = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const categories = await prisma.category.findMany({
            where: { restaurantId: request.restaurantId! },
            orderBy: { position: "asc" },
        });
        response.json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

export const updateCategory = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;
        const category = await prisma.category.findUnique({ where: { id } });
        if (!category || category.restaurantId !== request.restaurantId) {
            throw new AppError("Category not found", 404);
        }

        const updated = await prisma.category.update({ where: { id }, data: { name: request.body.name } });
        response.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// Owner: delete a category. Products keep existing (become uncategorized) via onDelete: SetNull.
export const deleteCategory = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;
        const category = await prisma.category.findUnique({ where: { id } });
        if (!category || category.restaurantId !== request.restaurantId) {
            throw new AppError("Category not found", 404);
        }

        await prisma.category.delete({ where: { id } });
        response.json({ success: true, message: "Category deleted" });
    } catch (error) {
        next(error);
    }
};
