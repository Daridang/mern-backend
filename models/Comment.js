import mongoose from "mongoose";

const { Schema, model } = mongoose;

const CommentSchema = new Schema({
  text: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  recipe: { type: Schema.Types.ObjectId, ref: "recipes", required: true },
  
  // For nested comments (replies)
  parentComment: { type: Schema.Types.ObjectId, ref: "Comment" },
  
  // Likes for comments
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  likesCount: { type: Number, default: 0 },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Pre-save middleware to update the updated_at field
CommentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Update likesCount when likes array changes
CommentSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  next();
});

export default model("Comment", CommentSchema);