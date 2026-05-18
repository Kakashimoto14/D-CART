import { ProductService } from "../services/product.service.js";

const productService = new ProductService();

export const listProducts = async (req, res) => {
  const result = await productService.listProducts(req.query);
  res.status(200).json(result);
};

export const getProduct = async (req, res) => {
  const product = await productService.getProductById(Number(req.params.id));
  res.status(200).json({ product });
};

export const createProduct = async (req, res) => {
  const product = await productService.createProduct(req.body, req.user);
  res.status(201).json({ product });
};

export const updateProduct = async (req, res) => {
  const product = await productService.updateProduct(Number(req.params.id), req.body, req.user);
  res.status(200).json({ product });
};

export const deleteProduct = async (req, res) => {
  await productService.deleteProduct(Number(req.params.id), req.user);
  res.status(204).send();
};
