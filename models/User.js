// models/User.js

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [20, "Name cannot exceed 20 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
      validate: {
        validator: function (value) {
          return /\d/.test(value) && /[!@#$%^&*(),.?":{}|<>]/.test(value);
        },
        message:
          "Password must contain at least one number and one special character",
      },
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "{VALUE} is not a valid role",
      },
      default: "user",
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],

    likedComments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: [],
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    lastLogin: {
      type: Date,
    },
    resetToken: String,
    resetTokenExpiration: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

// Explicitly create the unique index on email
UserSchema.index({ email: 1 }, { unique: true });

// Virtual for full name if needed in the future
UserSchema.virtual("fullName").get(function () {
  return this.name;
});

// Pre-save middleware to hash password
UserSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Pre-save middleware to update the updated_at field
UserSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Method to generate password reset token
UserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetTokenExpiration = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Static method to find active users
UserSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

export default model("User", UserSchema);
