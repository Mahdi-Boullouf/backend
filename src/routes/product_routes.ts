import { Router } from "express";
import {
    createProduct,
    getMyProducts,
    updateProduct,
    updateProductSchema,
    updateProductImages,
    deleteProduct,
} from "../controllers/product_controller";
import { replaceProductModifiers, replaceModifiersSchema } from "../controllers/modifier_controller";
import { validate } from "../middlewares/validate";
import { isLoggedInAsOwner } from "../middlewares/auth";
import { uploadMiddleware } from "../middlewares/upload";

const productRouter = Router();

productRouter.post("/", isLoggedInAsOwner, uploadMiddleware.array("images", 3), createProduct);
productRouter.get("/", isLoggedInAsOwner, getMyProducts);
productRouter.patch("/:id", isLoggedInAsOwner, validate(updateProductSchema), updateProduct);
productRouter.patch("/:id/images", isLoggedInAsOwner, uploadMiddleware.array("images", 3), updateProductImages);
productRouter.put("/:id/modifiers", isLoggedInAsOwner, validate(replaceModifiersSchema), replaceProductModifiers);
productRouter.delete("/:id", isLoggedInAsOwner, deleteProduct);

export default productRouter;
