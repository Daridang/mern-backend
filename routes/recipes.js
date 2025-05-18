import { Router } from "express";
import { getAll, getById } from "../controllers/recipes.js";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);

export default router;
