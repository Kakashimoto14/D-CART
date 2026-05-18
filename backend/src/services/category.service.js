import { prisma } from "../config/prisma.js";

export class CategoryService {
  async listCategories() {
    return prisma.category.findMany({
      orderBy: {
        name: "asc"
      }
    });
  }
}
