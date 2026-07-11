import { Router } from "express";
import {
    createCategory,
    createCategorySchema,
    getMyCategories,
    updateCategory,
    updateCategorySchema,
    deleteCategory,
} from "../controllers/category_controller";
import { validate } from "../middlewares/validate";
import { isLoggedInAsOwner } from "../middlewares/auth";

const categoryRouter = Router();

categoryRouter.post("/", isLoggedInAsOwner, validate(createCategorySchema), createCategory);
categoryRouter.get("/", isLoggedInAsOwner, getMyCategories);
categoryRouter.patch("/:id", isLoggedInAsOwner, validate(updateCategorySchema), updateCategory);
categoryRouter.delete("/:id", isLoggedInAsOwner, deleteCategory);

export default categoryRouter;
