import { Router } from "express";
import { createEmployee, createEmployeeSchema, getMyEmployees, deleteEmployee } from "../controllers/employee_controller";
import { validate } from "../middlewares/validate";
import { isLoggedInAsOwner } from "../middlewares/auth";

const employeeRouter = Router();

employeeRouter.post("/", isLoggedInAsOwner, validate(createEmployeeSchema), createEmployee);
employeeRouter.get("/", isLoggedInAsOwner, getMyEmployees);
employeeRouter.delete("/:id", isLoggedInAsOwner, deleteEmployee);

export default employeeRouter;
