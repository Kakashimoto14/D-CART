import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeEmail } from "../src/utils/normalizeEmail.js";
import { addStoreDays, startOfStoreDay } from "../src/utils/storeTime.js";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Fruits & Vegetables" },
    { name: "Rice & Pantry" },
    { name: "Beverages" },
    { name: "Snacks" },
    { name: "Dairy & Frozen" },
    { name: "Meat & Seafood" },
    { name: "Canned Goods" },
    { name: "Household" }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category
    });
  }

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: process.env.ADMIN_NAME || "Store Admin",
        email: adminEmail,
        password,
        role: "ADMIN"
      },
      create: {
        name: process.env.ADMIN_NAME || "Store Admin",
        email: adminEmail,
        password,
        role: "ADMIN",
        cart: {
          create: {}
        }
      }
    });
  }

  const staffPassword = await bcrypt.hash("staff123", 10);
  await prisma.user.upsert({
    where: { email: "picker@dcart.local" },
    update: {
      name: "Store Picker",
      password: staffPassword,
      role: "STAFF"
    },
    create: {
      name: "Store Picker",
      email: "picker@dcart.local",
      password: staffPassword,
      phone: "09171234567",
      role: "STAFF",
      cart: { create: {} }
    }
  });

  await prisma.storeConfig.upsert({
    where: { id: 1 },
    update: {
      storeName: "Decolores Retail Corporation (Main)",
      latitude: 14.752918,
      longitude: 121.138908,
      deliveryRadius: 5.0,
      baseFee: 30.0,
      perKmFee: 10.0
    },
    create: {
      id: 1,
      storeName: "Decolores Retail Corporation (Main)",
      latitude: 14.752918,
      longitude: 121.138908,
      deliveryRadius: 5.0,
      baseFee: 30.0,
      perKmFee: 10.0
    }
  });

  const allCategories = await prisma.category.findMany();
  const catMap = {};
  for (const category of allCategories) {
    catMap[category.name] = category.id;
  }

  const sampleProducts = [
    {
      name: "Banana (Lakatan)",
      price: 12.0,
      stock: 100,
      unit: "pc",
      categoryId: catMap["Fruits & Vegetables"],
      description: "Fresh Lakatan banana, locally sourced"
    },
    {
      name: "Tomato",
      price: 8.0,
      stock: 80,
      unit: "pc",
      categoryId: catMap["Fruits & Vegetables"],
      description: "Fresh red tomatoes"
    },
    {
      name: "Kangkong Bundle",
      price: 15.0,
      stock: 50,
      unit: "bundle",
      categoryId: catMap["Fruits & Vegetables"],
      description: "Fresh water spinach bundle"
    },
    {
      name: "Sinandomeng Rice 5kg",
      price: 265.0,
      stock: 30,
      unit: "sack",
      categoryId: catMap["Rice & Pantry"],
      description: "Premium Sinandomeng rice, 5kg"
    },
    {
      name: "Jasmine Rice 25kg",
      price: 1250.0,
      stock: 15,
      unit: "sack",
      categoryId: catMap["Rice & Pantry"],
      description: "Jasmine fragrant rice, 25kg sack"
    },
    {
      name: "Silver Swan Soy Sauce 1L",
      price: 65.0,
      stock: 40,
      unit: "bottle",
      categoryId: catMap["Rice & Pantry"],
      description: "All-purpose soy sauce"
    },
    {
      name: "Coca-Cola 1.5L",
      price: 75.0,
      stock: 60,
      unit: "bottle",
      categoryId: catMap["Beverages"],
      description: "Coca-Cola regular 1.5 liter"
    },
    {
      name: "Nescafe 3-in-1 (10 sachets)",
      price: 95.0,
      stock: 45,
      unit: "pack",
      categoryId: catMap["Beverages"],
      description: "Nescafe Original 3-in-1 instant coffee"
    },
    {
      name: "C2 Green Tea Apple 500ml",
      price: 20.0,
      stock: 100,
      unit: "bottle",
      categoryId: catMap["Beverages"],
      description: "C2 green tea apple flavor"
    },
    {
      name: "Piattos Cheese 85g",
      price: 32.0,
      stock: 70,
      unit: "pack",
      categoryId: catMap["Snacks"],
      description: "Piattos cheese flavored chips"
    },
    {
      name: "SkyFlakes Crackers (10 packs)",
      price: 55.0,
      stock: 50,
      unit: "pack",
      categoryId: catMap["Snacks"],
      description: "SkyFlakes saltine crackers"
    },
    {
      name: "Alaska Evaporated Milk 370ml",
      price: 42.0,
      stock: 55,
      unit: "can",
      categoryId: catMap["Dairy & Frozen"],
      description: "Alaska evaporated filled milk"
    },
    {
      name: "Magnolia Ice Cream 750ml",
      price: 145.0,
      stock: 20,
      unit: "tub",
      categoryId: catMap["Dairy & Frozen"],
      description: "Magnolia classic vanilla ice cream"
    },
    {
      name: "Pork Belly (Liempo) per kg",
      price: 320.0,
      stock: 25,
      unit: "kg",
      weight: 1.0,
      categoryId: catMap["Meat & Seafood"],
      description: "Fresh pork belly, per kilogram"
    },
    {
      name: "Chicken Whole Dressed",
      price: 195.0,
      stock: 20,
      unit: "pc",
      weight: 1.2,
      categoryId: catMap["Meat & Seafood"],
      description: "Whole dressed chicken, approximately 1.2kg"
    },
    {
      name: "Century Tuna Flakes 155g",
      price: 32.0,
      stock: 80,
      unit: "can",
      categoryId: catMap["Canned Goods"],
      description: "Century tuna flakes in oil"
    },
    {
      name: "Argentina Corned Beef 260g",
      price: 62.0,
      stock: 45,
      unit: "can",
      categoryId: catMap["Canned Goods"],
      description: "Argentina brand corned beef"
    },
    {
      name: "Safeguard Soap Bar",
      price: 38.0,
      stock: 60,
      unit: "pc",
      categoryId: catMap["Household"],
      description: "Safeguard antibacterial soap"
    },
    {
      name: "Joy Dishwashing Liquid 250ml",
      price: 45.0,
      stock: 40,
      unit: "bottle",
      categoryId: catMap["Household"],
      description: "Joy lemon dishwashing liquid"
    }
  ];

  for (const product of sampleProducts) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name }
    });

    if (!existing) {
      await prisma.product.create({ data: product });
    }
  }

  const timeSlots = [
    { startTime: "08:00", endTime: "10:00" },
    { startTime: "10:00", endTime: "12:00" },
    { startTime: "13:00", endTime: "15:00" },
    { startTime: "15:00", endTime: "17:00" }
  ];

  for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
    const date = startOfStoreDay(addStoreDays(new Date(), dayOffset));

    for (const slot of timeSlots) {
      await prisma.deliverySlot.upsert({
        where: {
          date_startTime_endTime: {
            date,
            startTime: slot.startTime,
            endTime: slot.endTime
          }
        },
        update: {},
        create: {
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxOrders: 5,
          isActive: true
        }
      });
    }
  }

  console.log("Seeded categories, users, main store geofence, products, and delivery slots.");
}

main()
  .catch((error) => {
    console.error("Failed to seed database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
