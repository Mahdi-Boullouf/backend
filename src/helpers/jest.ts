import { Response } from "express";
export function successResponse(res: Response, data: object) {
  return res.json({ success: true, data });
}