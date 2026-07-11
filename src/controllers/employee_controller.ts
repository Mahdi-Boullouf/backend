import { z } from "zod";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { AppError } from "../helpers/error";

export const createEmployeeSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
    role: z.enum(["CHEF", "PAYMENTAGENT"]),
});

// Owner: hire a chef or payment agent for their own restaurant.
export const createEmployee = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { email, password, role } = request.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new AppError("A user with this email already exists", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const employee = await prisma.user.create({
            data: { email, password: hashedPassword, role, employerRestaurantId: request.restaurantId! },
            select: { id: true, email: true, role: true, createdAt: true },
        });

        response.status(201).json({ success: true, data: employee });
    } catch (error) {
        next(error);
    }
};

// Owner: list their own restaurant's staff.
export const getMyEmployees = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const employees = await prisma.user.findMany({
            where: { employerRestaurantId: request.restaurantId! },
            select: { id: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        });
        response.json({ success: true, data: employees });
    } catch (error) {
        next(error);
    }
};

// Owner: revoke an employee's access.
export const deleteEmployee = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const id = request.params.id as string;

        const employee = await prisma.user.findUnique({ where: { id } });
        if (!employee || employee.employerRestaurantId !== request.restaurantId) {
            throw new AppError("Employee not found", 404);
        }

        await prisma.user.delete({ where: { id } });
        response.json({ success: true, message: "Employee removed" });
    } catch (error) {
        next(error);
    }
};
