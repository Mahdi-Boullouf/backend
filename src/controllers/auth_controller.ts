import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { AppError } from "../helpers/error";

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

export const login = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { email, password } = request.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new AppError("Invalid credentials", 401);
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new AppError("Invalid credentials", 401);
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT!,
        );

        response.json({
            success: true,
            data: {
                user: { id: user.id, email: user.email, role: user.role },
                token,
            },
        });
    } catch (error) {
        next(error);
    }
};
