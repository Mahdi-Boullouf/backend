import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { AppError } from "../helpers/error";

export const replaceModifiersSchema = z.object({
    groups: z.array(z.object({
        name: z.string().min(1),
        type: z.enum(["SINGLE", "MULTIPLE"]),
        required: z.boolean().default(false),
        options: z.array(z.object({
            name: z.string().min(1),
            price: z.number().min(0),
        })).min(1),
    })),
});

// Owner: replace a product's entire modifier group/option tree in one shot.
export const replaceProductModifiers = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const productId = request.params.id as string;
        const { groups } = request.body;

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product || product.restaurantId !== request.restaurantId) {
            throw new AppError("Product not found", 404);
        }

        await prisma.$transaction(async (tx) => {
            await tx.modifierGroup.deleteMany({ where: { productId } });
            for (const group of groups) {
                await tx.modifierGroup.create({
                    data: {
                        name: group.name,
                        type: group.type,
                        required: group.required,
                        productId,
                        options: { create: group.options },
                    },
                });
            }
        });

        const updated = await prisma.modifierGroup.findMany({
            where: { productId },
            include: { options: true },
        });

        response.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
