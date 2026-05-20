import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
const uploadDir = path.resolve("uploads", "products");
const allowedMimeTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = allowedMimeTypes.get(file.mimetype);
    callback(null, `${randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError("Only JPG, PNG, and WebP product images are allowed.", 400));
      return;
    }

    callback(null, true);
  }
});

router.post(
  "/product-image",
  authenticate,
  authorize("ADMIN"),
  upload.single("image"),
  (req, res, next) => {
    if (!req.file) {
      next(new AppError("Product image file is required.", 400));
      return;
    }

    res.status(201).json({
      url: `/uploads/products/${req.file.filename}`
    });
  }
);

export default router;
