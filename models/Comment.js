import mongoose from "mongoose";

const { Schema, model } = mongoose;

const CommentSchema = new Schema(
  {
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipe: {
      type: Schema.Types.ObjectId,
      ref: "recipes",
      required: true,
    },

    // For nested comments (replies)
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },

    // Likes for comments
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure unique likes (optional addition)
CommentSchema.pre("save", function (next) {
  if (this.isModified("likes")) {
    // Convert ObjectIds to strings for comparison
    const uniqueLikes = [...new Set(this.likes.map((id) => id.toString()))];
    // Convert back to ObjectIds
    this.likes = uniqueLikes.map((id) => new mongoose.Types.ObjectId(id));
    this.likesCount = this.likes.length;
  }
  next();
});

// Virtual for replies
CommentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
});

export default model("Comment", CommentSchema);
