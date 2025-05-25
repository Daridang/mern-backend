import express from "express";
import {
  createComment,
  getRecipeComments,
  updateComment,
  deleteComment,
  toggleLikeComment,
  getUserComments,
} from "../controllers/commentController.js";
import auth from "../middleware/auth.js"; // Импорт по умолчанию

const router = express.Router();

// Public routes
router.get("/recipe/:recipeId", getRecipeComments);
router.get("/user/:userId", getUserComments);

// Protected routes
router.post("/", auth, createComment);
router.put("/:id", auth, updateComment);
router.delete("/:id", auth, deleteComment);
router.post("/:id/like", auth, toggleLikeComment);

export default router;
