import express from "express";
import {
  createComment,
  getRecipeComments,
  updateComment,
  deleteComment,
  toggleLikeComment,
  getUserComments,
  getUserLikedComments,
} from "../controllers/commentController.js";
import auth from "../middleware/auth.js"; // Импорт по умолчанию

const router = express.Router();

// Public routes
router.get("/recipe/:recipeId", getRecipeComments);
router.get("/user/:userId", getUserComments);
router.get("/user/:userId/liked", auth, getUserLikedComments);

// Protected routes
router.post("/", auth, createComment);
router.get("/liked", auth, getUserLikedComments);
router.put("/:id", auth, updateComment);
router.delete("/:id", auth, deleteComment);
router.patch("/:id/like", auth, toggleLikeComment);

export default router;
