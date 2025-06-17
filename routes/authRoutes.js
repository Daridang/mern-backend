// routes/auth.js
import express from "express";
import {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  deleteUser,
  getUserProfile,
} from "../controllers/auth.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.get("/users/:id", getUserProfile);

// Protected routes
router.get("/me", auth, getCurrentUser);
router.put("/update-profile", auth, updateProfile);
router.put("/change-password", auth, changePassword);
router.delete("/delete-profile", auth, deleteUser);

export default router;
