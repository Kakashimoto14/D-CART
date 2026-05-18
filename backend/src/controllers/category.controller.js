import { CategoryService } from "../services/category.service.js";

const categoryService = new CategoryService();

export const listCategories = async (_req, res) => {
  const categories = await categoryService.listCategories();
  res.status(200).json({ categories });
};
