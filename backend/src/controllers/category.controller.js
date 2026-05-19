import { CategoryService } from "../services/category.service.js";

const categoryService = new CategoryService();

export const listCategories = async (req, res) => {
  const categories = await categoryService.listCategories(req.query);
  res.status(200).json({ categories });
};

export const createCategory = async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ category });
};

export const updateCategory = async (req, res) => {
  const category = await categoryService.updateCategory(Number(req.params.id), req.body);
  res.status(200).json({ category });
};

export const deleteCategory = async (req, res) => {
  const result = await categoryService.deleteCategory(Number(req.params.id));
  res.status(200).json(result);
};
