import express from "express";
import auth from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";
import {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUserByAdmin,
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

export default router;
