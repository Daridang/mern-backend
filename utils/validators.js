
// utils/validators.js
import { body } from "express-validator";

export const recipeValidationRules = () => {
  return [
    body("title").notEmpty().withMessage("Title is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("category").notEmpty().withMessage("Category is required"),
    body("yield").notEmpty().withMessage("Yield is required"),
    body("serving_size").notEmpty().withMessage("Serving size is required"),
    body("prep_time").notEmpty().withMessage("Prep time is required"),
    body("temperature").notEmpty().withMessage("Temperature is required"),
    body("ingredients").notEmpty().withMessage("Ingredients is required"),
    body("equipment").notEmpty().withMessage("Equipment is required"),
    body("instructions").notEmpty().withMessage("Instructions is required"),
    body("extras").notEmpty().withMessage("Extras is required"),
  ];
};
