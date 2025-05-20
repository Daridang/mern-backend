// routes/recipes.js
import { Router } from "express";
import multer from "multer";

import { getAll, getById, createRecipe } from "../controllers/recipes.js";

const router = Router();
const upload = multer();

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", upload.single("image"), createRecipe);

export default router;
