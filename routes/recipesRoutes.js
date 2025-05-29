// routes/recipes.js
import express from "express";
import {
  getAll,
  getById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  toggleLikeRecipe,
} from "../controllers/recipes.js";
import upload from "../middleware/upload.js";
import { recipeValidationRules } from "../utils/validators.js";
import { validate } from "../middleware/validation.js";
import auth from "../middleware/auth.js";
const router = express.Router();

router.get("/", getAll);
router.get("/:id", getById);
router.post("/:id/like", auth, toggleLikeRecipe);
router.post(
  "/",
  upload.single("image"),
  recipeValidationRules(),
  validate,
  createRecipe
);
router.put(
  "/:id",
  upload.single("image"),
  recipeValidationRules(),
  validate,
  updateRecipe
);
router.delete("/:id", deleteRecipe);

export default router;
