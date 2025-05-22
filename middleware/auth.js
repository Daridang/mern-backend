// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET;

// Function to extract token from Authorization header
const extractToken = (authHeader) => {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1];
  }
  return null;
};

export default async function auth(req, res, next) {
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not defined in environment variables.");
    return res
      .status(500)
      .json({ error: "Internal server error: JWT secret not configured" });
  }

  try {
    // Check if Authorization header exists and extract token
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Provide more specific error messages based on the error type
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
      } else if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token" });
      } else {
        console.error("JWT verification error:", err);
        return res.status(401).json({ error: "Authentication failed" });
      }
    }

    // Validate user exists and is active
    try {
      // Option 1: Store only essential data in request
      req.userId = payload.userId;
      req.userRole = payload.role; // Useful for role-based authorization

      // Option 2: Fetch full user (if needed for your routes)
      // This is optional - you can use either approach based on your needs
      const user = await User.findById(payload.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      if (!user.isActive) {
        return res.status(403).json({ error: "Account is deactivated" });
      }

      // Store user in request object (without password)
      req.user = user;

      next();
    } catch (dbErr) {
      console.error("Database error in auth middleware:", dbErr);
      return res.status(500).json({ error: "Internal server error" });
    }
  } catch (error) {
    // Catch any other unexpected errors
    console.error("Unexpected error in auth middleware:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
