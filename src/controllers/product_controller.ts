import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { AppError } from "../helpers/error";

export const updateProductSchema = z.object({
    name: z.string().min(2).optional(),
    price: z.number().positive().optional(),
    isAvailable: z.boolean().optional(),
    categoryId: z.string().nullable().optional(),
});

const filesToImageUrls = (files: Express.Multer.File[] | undefined): string[] =>
    (files ?? []).map((file) => `/uploads/${file.filename}`);

const assertCategoryOwnership = async (categoryId: string | undefined | null, restaurantId: string) => {
    if (!categoryId) return;
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.restaurantId !== restaurantId) {
        throw new AppError("Category not found", 404);
    }
};

// Owner: create a product under their own restaurant, with up to 3 images (multipart).
export const createProduct = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { name, price, categoryId } = request.body;
        const parsedPrice = Number(price);

        if (!name || typeof name !== "string" || name.trim().length < 2) {
            throw new AppError("Name must be at least 2 characters", 400);
        }
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            throw new AppError("Price must be a positive number", 400);
        }
        await assertCategoryOwnership(categoryId, request.restaurantId!);

        const images = filesToImageUrls(request.files as Express.Multer.File[] | undefined);

        const product = await prisma.product.create({
            data: {
                name,
                price: parsedPrice,
                images,
                restaurantId: request.restaurantId!,
                categoryId: categoryId || null,
            },
        });
        response.status(201).json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
};

// Owner: list their own restaurant's products (including unavailable ones, for management).
export const getMyProducts = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const products = await prisma.product.findMany({
            where: { restaurantId: request.restaurantId! },
            include: { modifierGroups: { include: { options: true } }, category: true },
            orderBy: { name: "asc" },
        });
        response.json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product || product.restaurantId !== request.restaurantId) {
            throw new AppError("Product not found", 404);
        }
        if (request.body.categoryId !== undefined) {
            await assertCategoryOwnership(request.body.categoryId, request.restaurantId!);
        }

        const updated = await prisma.product.update({ where: { id }, data: request.body });
        response.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// Owner: replace a product's images (up to 3, multipart). Overwrites the existing set.
export const updateProductImages = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product || product.restaurantId !== request.restaurantId) {
            throw new AppError("Product not found", 404);
        }

        const images = filesToImageUrls(request.files as Express.Multer.File[] | undefined);
        if (images.length === 0) {
            throw new AppError("At least one image is required", 400);
        }

        const updated = await prisma.product.update({ where: { id }, data: { images } });
        response.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

export const deleteProduct = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product || product.restaurantId !== request.restaurantId) {
            throw new AppError("Product not found", 404);
        }

        await prisma.product.delete({ where: { id } });
        response.json({ success: true, message: "Product deleted" });
    } catch (error) {
        next(error);
    }
};
