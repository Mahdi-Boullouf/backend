import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";
import { AppError } from "../helpers/error";

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Error : ", err);
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    if (err instanceof MulterError) {
        const message = err.code === "LIMIT_UNEXPECTED_FILE" ? "You can upload at most 3 images" : err.message;
        return res.status(400).json({ success: false, message });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
};
