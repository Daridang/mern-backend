// routes/recipes.js
import express from "express";
import {
  getAll,
  getById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "../controllers/recipes.js";
import upload from "../middleware/upload.js";
import { recipeValidationRules } from "../utils/validators.js";
import { validate } from "../middleware/validation.js";

const router = express.Router();

router.get("/", getAll);
router.get("/:id", getById);
router.post(
  "/",
  upload.single("image"),
  recipeValidationRules(),
  validate,
  createRecipe
);
router.put("/:id", upload.single("image"), recipeValidationRules(), validate, updateRecipe);
router.delete("/:id", deleteRecipe);

export default router;