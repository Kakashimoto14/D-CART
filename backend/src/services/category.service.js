import { prisma } from "../config/prisma.js";
import { logger } from "../infrastructure/logger/logger.js";
import { AppError } from "../utils/AppError.js";

const OPTIONAL_CATEGORY_COLUMNS = ["description", "image", "isActive"];
let categoryColumnSupportCache = null;

export class CategoryService {
  async getColumnSupport() {
    if (categoryColumnSupportCache) {
      return categoryColumnSupportCache;
    }

    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'categories'
          AND column_name IN ('description', 'image', 'isActive')
      `;
      const available = new Set(columns.map((column) => column.column_name));

      categoryColumnSupportCache = OPTIONAL_CATEGORY_COLUMNS.reduce(
        (support, columnName) => ({
          ...support,
          [columnName]: available.has(columnName)
        }),
        {}
      );
    } catch (error) {
      logger.warn({ err: error }, "Unable to inspect category optional columns.");
      categoryColumnSupportCache = {
        description: false,
        image: false,
        isActive: false
      };
    }

    return categoryColumnSupportCache;
  }

  buildCategorySelect(columnSupport = {}) {
    return {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      ...(columnSupport.description ? { description: true } : {}),
      ...(columnSupport.image ? { image: true } : {}),
      ...(columnSupport.isActive ? { isActive: true } : {}),
      _count: {
        select: {
          products: true
        }
      }
    };
  }

  mapCategory(record) {
    return {
      id: record.id,
      name: record.name,
      description: record.description || null,
      image: record.image || null,
      isActive: record.isActive ?? true,
      productCount: record._count?.products ?? record.productCount ?? 0,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  async listCategories({ includeInactive = false } = {}) {
    try {
      const columnSupport = await this.getColumnSupport();
      const categories = await prisma.category.findMany({
        where:
          includeInactive || !columnSupport.isActive
            ? {}
            : { isActive: true },
        select: this.buildCategorySelect(columnSupport),
        orderBy: columnSupport.isActive ? [{ isActive: "desc" }, { name: "asc" }] : [{ name: "asc" }]
      });

      return categories.map((category) => this.mapCategory(category));
    } catch (error) {
      logger.error({ err: error, includeInactive }, "Category list query failed.");
      throw error;
    }
  }

  async createCategory(payload) {
    const columnSupport = await this.getColumnSupport();
    const category = await prisma.category.create({
      data: {
        name: payload.name,
        ...(columnSupport.description ? { description: payload.description || null } : {}),
        ...(columnSupport.image ? { image: payload.image || null } : {}),
        ...(columnSupport.isActive ? { isActive: payload.isActive ?? true } : {})
      },
      select: this.buildCategorySelect(columnSupport)
    });

    return this.mapCategory(category);
  }

  async updateCategory(categoryId, payload) {
    const columnSupport = await this.getColumnSupport();
    await this.ensureCategoryExists(categoryId);

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: payload.name,
        ...(columnSupport.description
          ? { description: payload.description === undefined ? undefined : payload.description || null }
          : {}),
        ...(columnSupport.image
          ? { image: payload.image === undefined ? undefined : payload.image || null }
          : {}),
        ...(columnSupport.isActive ? { isActive: payload.isActive } : {})
      },
      select: this.buildCategorySelect(columnSupport)
    });

    return this.mapCategory(category);
  }

  async deleteCategory(categoryId) {
    const columnSupport = await this.getColumnSupport();
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: this.buildCategorySelect(columnSupport)
    });

    if (!category) {
      throw new AppError("Category not found.", 404);
    }

    if (category._count.products > 0 && columnSupport.isActive) {
      const archived = await prisma.category.update({
        where: { id: categoryId },
        data: { isActive: false },
        select: this.buildCategorySelect(columnSupport)
      });

      return {
        category: this.mapCategory(archived),
        archived: true
      };
    }

    if (category._count.products > 0) {
      throw new AppError(
        "Category cannot be archived until the category status migration is applied.",
        409,
        null,
        "VALIDATION_ERROR"
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
      select: this.buildCategorySelect(columnSupport)
    });

    return { category: this.mapCategory(category), archived: false };
  }

  async ensureCategoryExists(categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true }
    });

    if (!category) {
      throw new AppError("Category not found.", 404);
    }

    return category;
  }
}
