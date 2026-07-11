import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { AppError } from "../helpers/error";
import { isSubscriptionActive } from "../helpers/subscription";
import { emitNewOrder, emitOrderUpdated } from "../socket";

const orderItemInclude = { items: { include: { product: true, modifiers: true } } } as const;

export const createOrderSchema = z.object({
    restaurantId: z.string(),
    tableName: z.string().min(1),
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        modifierOptionIds: z.array(z.string()).default([]),
    })).min(1),
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
});

export const updateOrderFlagsSchema = z.object({
    isPrepared: z.boolean().optional(),
    isPaid: z.boolean().optional(),
});

interface OrderItemInput {
    productId: string;
    quantity: number;
    modifierOptionIds: string[];
}

// Public: place an order for a restaurant's table. No account required.
export const createOrder = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { restaurantId, tableName, items } = request.body as { restaurantId: string; tableName: string; items: OrderItemInput[] };

        const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
        if (!restaurant) {
            throw new AppError("Restaurant not found", 404);
        }
        if (!isSubscriptionActive(restaurant)) {
            throw new AppError("This restaurant is not currently accepting orders", 403);
        }

        const productIds = items.map((item) => item.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, restaurantId },
            include: { modifierGroups: { include: { options: true } } },
        });

        if (products.length !== new Set(productIds).size) {
            throw new AppError("One or more products are invalid for this restaurant", 400);
        }
        const unavailable = products.find((product) => !product.isAvailable);
        if (unavailable) {
            throw new AppError(`Product "${unavailable.name}" is not available`, 400);
        }

        const productById = new Map(products.map((product) => [product.id, product]));
        let total = 0;
        const orderItemsData = items.map((item) => {
            const product = productById.get(item.productId)!;
            const optionById = new Map(product.modifierGroups.flatMap((group) => group.options.map((option) => [option.id, { option, group }])));

            const selected = item.modifierOptionIds.map((optionId) => {
                const found = optionById.get(optionId);
                if (!found) {
                    throw new AppError(`Invalid modifier option for "${product.name}"`, 400);
                }
                return found;
            });

            for (const group of product.modifierGroups) {
                const selectedInGroup = selected.filter((s) => s.group.id === group.id);
                if (group.required && selectedInGroup.length === 0) {
                    throw new AppError(`"${group.name}" is required for "${product.name}"`, 400);
                }
                if (group.type === "SINGLE" && selectedInGroup.length > 1) {
                    throw new AppError(`"${group.name}" allows only one choice for "${product.name}"`, 400);
                }
            }

            const modifiersTotal = selected.reduce((sum, s) => sum + s.option.price, 0);
            total += (product.price + modifiersTotal) * item.quantity;

            return {
                productId: product.id,
                quantity: item.quantity,
                price: product.price,
                modifiers: { create: selected.map((s) => ({ name: s.option.name, price: s.option.price })) },
            };
        });

        const order = await prisma.order.create({
            data: {
                restaurantId,
                tableName,
                total,
                items: { create: orderItemsData },
            },
            include: orderItemInclude,
        });

        emitNewOrder(restaurantId, order);

        response.status(201).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

// Owner: list today's orders for their own restaurant.
export const getMyOrders = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const orders = await prisma.order.findMany({
            where: { restaurantId: request.restaurantId!, createdAt: { gte: startOfDay, lt: endOfDay } },
            include: orderItemInclude,
            orderBy: { createdAt: "desc" },
        });
        response.json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};

// Owner: update an order's status (e.g. mark completed/cancelled). Scoped to their own restaurant.
export const updateOrderStatus = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order || order.restaurantId !== request.restaurantId) {
            throw new AppError("Order not found", 404);
        }

        const updated = await prisma.order.update({ where: { id }, data: { status: request.body.status } });
        response.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// Owner + staff: every unresolved order for their restaurant, oldest first. Not day-scoped —
// an order stays "live" until it's prepared and paid, regardless of when it was placed.
export const getLiveOrders = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const orders = await prisma.order.findMany({
            where: {
                restaurantId: request.restaurantId!,
                status: "PENDING",
            },
            include: orderItemInclude,
            orderBy: { createdAt: "asc" },
        });
        response.json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};

// Owner + staff: toggle prepared/paid on an order. Auto-completes once both are true.
export const updateOrderFlags = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order || order.restaurantId !== request.restaurantId) {
            throw new AppError("Order not found", 404);
        }

        const isPrepared = request.body.isPrepared ?? order.isPrepared;
        const isPaid = request.body.isPaid ?? order.isPaid;
        const status = isPrepared && isPaid ? "COMPLETED" : order.status === "CANCELLED" ? "CANCELLED" : "PENDING";

        const updated = await prisma.order.update({
            where: { id },
            data: { isPrepared, isPaid, status },
            include: orderItemInclude,
        });

        emitOrderUpdated(request.restaurantId!, updated);

        response.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
