import mongoose from "mongoose";

const { Schema, model } = mongoose;

const CommentSchema = new Schema(
  {
    text: { 
      type: String, 
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"]
    },
    author: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    recipe: { 
      type: Schema.Types.ObjectId, 
      ref: "recipes", 
      required: true 
    },
    
    // For nested comments (replies)
    parentComment: { 
      type: Schema.Types.ObjectId, 
      ref: "Comment" 
    },
    
    // Likes for comments
    likes: [{ 
      type: Schema.Types.ObjectId, 
      ref: "User" 
    }],
    likesCount: { 
      type: Number, 
      default: 0 
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Update likesCount when likes array changes
CommentSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  next();
});

// Virtual for replies
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment'
});

export default model("Comment", CommentSchema);