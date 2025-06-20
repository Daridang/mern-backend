import express from "express";
import auth from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";
import {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUserByAdmin,
  getAllRecipesAdmin,
  getRecipeByIdAdmin,
  updateRecipeAdmin,
  deleteRecipeAdmin,
  getAllCommentsAdmin,
  getCommentByIdAdmin,
  updateCommentAdmin,
  deleteCommentAdmin,
} from "../controllers/adminController.js";

const router = express.Router();

// Все админские маршруты сначала проходят через auth, затем через adminAuth
router.use(auth);
router.use(adminAuth);

// User Management
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.patch("/users/:id/status", toggleUserStatus);
router.delete("/users/:id", deleteUserByAdmin);

// Recipe Management
router.get("/recipes", getAllRecipesAdmin);
router.get("/recipes/:id", getRecipeByIdAdmin);
router.put("/recipes/:id", updateRecipeAdmin);
router.delete("/recipes/:id", deleteRecipeAdmin);

// Comment Management
router.get("/comments", getAllCommentsAdmin);
router.get("/comments/:id", getCommentByIdAdmin);
router.put("/comments/:id", updateCommentAdmin);
router.delete("/comments/:id", deleteCommentAdmin);

export default router;
