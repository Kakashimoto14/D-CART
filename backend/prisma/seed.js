import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeEmail } from "../src/utils/normalizeEmail.js";
import { addStoreDays, startOfStoreDay } from "../src/utils/storeTime.js";

const prisma = new PrismaClient();

const placeholder = (label, bg = "fff3ee", fg = "0d1b2a") =>
  `https://placehold.co/600x400/${bg}/${fg}.png?text=${encodeURIComponent(label)}`;

const suppliers = {
  default: "Decolores Main Supplier",
  grocery: "Local Grocery Distributor",
  beverages: "Beverage Distributor",
  rice: "Rice Supplier",
  household: "Household Essentials Supplier",
  personal: "Personal Care Distributor"
};

const categories = [
  {
    name: "Rice & Grains",
    description: "Bigas options by kilo, small pack, and sack for daily meals and family stock-up.",
    image: placeholder("Rice & Grains", "fef3c7", "713f12"),
    isActive: true
  },
  {
    name: "Snacks / Chichirya",
    description: "Pinoy chips, crackers, biscuits, and chichirya for merienda and sari-sari baskets.",
    image: placeholder("Snacks", "ffedd5", "9a3412"),
    isActive: true
  },
  {
    name: "Canned Goods",
    description: "Shelf-stable sardines, tuna, corned beef, meat loaf, and easy ulam staples.",
    image: placeholder("Canned Goods", "fee2e2", "991b1b"),
    isActive: true
  },
  {
    name: "Noodles & Instant Food",
    description: "Instant pancit canton, mami, cup noodles, and quick-cook meals.",
    image: placeholder("Instant Food", "fef9c3", "854d0e"),
    isActive: true
  },
  {
    name: "Condiments & Sauces",
    description: "Toyo, suka, patis, ketchup, lechon sauce, oyster sauce, and everyday sauces.",
    image: placeholder("Condiments", "dcfce7", "14532d"),
    isActive: true
  },
  {
    name: "Seasonings & Cooking Ingredients",
    description: "Seasoning granules, MSG, spices, salt, sugar, cooking oil, and pantry helpers.",
    image: placeholder("Seasonings", "ede9fe", "4c1d95"),
    isActive: true
  },
  {
    name: "Beverages",
    description: "Water, soft drinks, powdered drinks, coffee sachets, milk drinks, and tea.",
    image: placeholder("Beverages", "dbeafe", "1e3a8a"),
    isActive: true
  },
  {
    name: "Alcoholic Beverages",
    description: "Age-restricted beer, gin, brandy, rum, and spirits. For future age verification.",
    image: placeholder("Alcoholic Drinks", "e0e7ff", "312e81"),
    isActive: true
  },
  {
    name: "Personal Care",
    description: "Shampoo sachets, soap, alcohol, toothpaste, toothbrushes, deodorant, and hygiene items.",
    image: placeholder("Personal Care", "fce7f3", "831843"),
    isActive: true
  },
  {
    name: "Laundry & Cleaning",
    description: "Detergents, bleach, fabric conditioner, dishwashing supplies, sponges, and cleaners.",
    image: placeholder("Cleaning", "ccfbf1", "134e4a"),
    isActive: true
  },
  {
    name: "Household Essentials",
    description: "Tissue, trash bags, disposable tableware, foil, containers, candles, matches, and batteries.",
    image: placeholder("Household", "e5e7eb", "111827"),
    isActive: true
  },
  {
    name: "Candies & Sweets",
    description: "Candies, chocolates, lollipops, marshmallows, gummies, and assorted packs.",
    image: placeholder("Candies", "ffe4e6", "9f1239"),
    isActive: true
  },
  {
    name: "Baby & Kids",
    description: "Diapers, wipes, baby powder, baby soap, and child-friendly daily needs.",
    image: placeholder("Baby & Kids", "cffafe", "155e75"),
    isActive: true
  },
  {
    name: "Frozen / Chilled Goods",
    description: "Cold-chain products are kept inactive until storage, delivery, and temperature handling are supported.",
    image: placeholder("Frozen Goods", "e0f2fe", "075985"),
    isActive: false
  }
];

const product = ({
  sku,
  name,
  category,
  description,
  price,
  stock,
  unit,
  supplier = suppliers.grocery,
  reorderPoint = 10,
  reorderQty = 24,
  unitCost,
  expiresInDays,
  imageLabel,
  bg,
  fg,
  wholesale = false,
  ageRestricted = false,
  weight = null
}) => ({
  sku,
  name,
  category,
  description: [
    description,
    wholesale ? "Wholesale-ready item: add wholesale_price, wholesale_min_qty, and is_wholesale_available fields when the schema supports wholesale pricing." : null,
    ageRestricted ? "Age-restricted item: require legal-age verification before purchase when checkout support is added." : null
  ].filter(Boolean).join(" "),
  price,
  stock,
  unit,
  supplier,
  reorderPoint,
  reorderQty,
  unitCost: unitCost ?? Number((price * 0.78).toFixed(2)),
  expiresInDays,
  image: placeholder(imageLabel || name, bg, fg),
  weight
});

const products = [
  product({ sku: "DCART-RG-001", name: "Regular Rice per Kilo", category: "Rice & Grains", description: "Affordable everyday bigas for daily family meals.", price: 48, stock: 180, unit: "kilo", supplier: suppliers.rice, reorderPoint: 40, reorderQty: 100, wholesale: true, bg: "fef3c7", fg: "713f12" }),
  product({ sku: "DCART-RG-002", name: "Regular Rice 25kg Sack", category: "Rice & Grains", description: "Budget-friendly 25kg sack for weekly household stock-up.", price: 1180, stock: 18, unit: "sack", supplier: suppliers.rice, reorderPoint: 5, reorderQty: 10, wholesale: true, bg: "fef3c7", fg: "713f12" }),
  product({ sku: "DCART-RG-003", name: "Premium Rice per Kilo", category: "Rice & Grains", description: "Soft premium white rice suitable for everyday ulam pairings.", price: 58, stock: 160, unit: "kilo", supplier: suppliers.rice, reorderPoint: 35, reorderQty: 80, wholesale: true, bg: "fef3c7", fg: "713f12" }),
  product({ sku: "DCART-RG-004", name: "Premium Rice 25kg Sack", category: "Rice & Grains", description: "Premium 25kg sack for larger households and small eateries.", price: 1420, stock: 14, unit: "sack", supplier: suppliers.rice, reorderPoint: 4, reorderQty: 8, wholesale: true, bg: "fef3c7", fg: "713f12" }),
  product({ sku: "DCART-RG-005", name: "Dinorado Rice per Kilo", category: "Rice & Grains", description: "Aromatic Dinorado rice with a soft bite and fragrant finish.", price: 62, stock: 120, unit: "kilo", supplier: suppliers.rice, reorderPoint: 25, reorderQty: 60, wholesale: true, bg: "fef3c7", fg: "713f12" }),
  product({ sku: "DCART-RG-006", name: "Dinorado Rice 25kg Sack", category: "Rice & Grains", description: "Dinorado 25kg sack for special meals and premium daily rice.", price: 1530, stock: 10, unit: "sack", supplier: suppliers.rice, reorderPoint: 3, reorderQty: 6, wholesale: true, bg: "fef3c7", fg: "713f12" }),
  product({ sku: "DCART-RG-007", name: "Jasmine Rice per Kilo", category: "Rice & Grains", description: "Fragrant Jasmine rice for steamed rice, fried rice, and baon.", price: 66, stock: 110, unit: "kilo", supplier: suppliers.rice, reorderPoint: 25, reorderQty: 60, wholesale: true, bg: "fef3c7", fg: "713f12" }),
  product({ sku: "DCART-RG-008", name: "Jasmine Rice 25kg Sack", category: "Rice & Grains", description: "Long-grain Jasmine rice packed in a 25kg family sack.", price: 1600, stock: 9, unit: "sack", supplier: suppliers.rice, reorderPoint: 3, reorderQty: 6, wholesale: true, bg: "fef3c7", fg: "713f12" }),
  product({ sku: "DCART-RG-009", name: "Sinandomeng Rice 5kg Pack", category: "Rice & Grains", description: "Convenient 5kg Sinandomeng pack for small households.", price: 285, stock: 36, unit: "pack", supplier: suppliers.rice, reorderPoint: 8, reorderQty: 16, wholesale: true, bg: "fef3c7", fg: "713f12" }),
  product({ sku: "DCART-RG-010", name: "Sinandomeng Rice 25kg Sack", category: "Rice & Grains", description: "Classic Sinandomeng rice sack with good grain quality for daily meals.", price: 1375, stock: 12, unit: "sack", supplier: suppliers.rice, reorderPoint: 4, reorderQty: 8, wholesale: true, bg: "fef3c7", fg: "713f12" }),

  product({ sku: "DCART-SN-001", name: "Oishi Prawn Crackers 60g", category: "Snacks / Chichirya", description: "Crunchy prawn-flavored snack for quick merienda.", price: 18, stock: 90, unit: "pack", bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-002", name: "Oishi Pillows Ube 38g", category: "Snacks / Chichirya", description: "Cream-filled ube snack pillows with a light crisp shell.", price: 16, stock: 85, unit: "pack", bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-003", name: "Piattos Cheese 85g", category: "Snacks / Chichirya", description: "Thin potato crisps with a familiar cheese flavor.", price: 36, stock: 70, unit: "pack", bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-004", name: "Nova Multigrain Snack 78g", category: "Snacks / Chichirya", description: "Crunchy multigrain chips for sharing or baon.", price: 36, stock: 68, unit: "pack", bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-005", name: "Chippy Barbecue 110g", category: "Snacks / Chichirya", description: "Classic barbecue-flavored corn chips for group merienda.", price: 35, stock: 60, unit: "pack", bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-006", name: "Clover Chips Cheese 55g", category: "Snacks / Chichirya", description: "Cheesy corn snack with a light, crunchy bite.", price: 19, stock: 80, unit: "pack", bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-007", name: "Boy Bawang Garlic 100g", category: "Snacks / Chichirya", description: "Garlic-flavored crunchy corn snack for pulutan or merienda.", price: 30, stock: 72, unit: "pack", bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-008", name: "Mang Juan Chicharron 90g", category: "Snacks / Chichirya", description: "Chicharron-style snack with a savory crunch.", price: 34, stock: 58, unit: "pack", bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-009", name: "Martys Vegetarian Chicharon 90g", category: "Snacks / Chichirya", description: "Vegetable-based chicharon-style snack for sharing.", price: 34, stock: 55, unit: "pack", bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-010", name: "SkyFlakes Crackers 10s", category: "Snacks / Chichirya", description: "Saltine crackers in a value pack for baon and pantry storage.", price: 58, stock: 52, unit: "pack", wholesale: true, bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-011", name: "Rebisco Crackers 10s", category: "Snacks / Chichirya", description: "Everyday crackers for breakfast, merienda, and packed snacks.", price: 54, stock: 50, unit: "pack", wholesale: true, bg: "ffedd5", fg: "9a3412" }),
  product({ sku: "DCART-SN-012", name: "Hansel Sandwich Biscuits 10s", category: "Snacks / Chichirya", description: "Cream sandwich biscuits packed for family snack boxes.", price: 62, stock: 45, unit: "pack", wholesale: true, bg: "ffedd5", fg: "9a3412" }),

  product({ sku: "DCART-CG-001", name: "Tomato Sardines 155g", category: "Canned Goods", description: "Budget-friendly sardines in tomato sauce for quick ulam.", price: 24, stock: 95, unit: "can", bg: "fee2e2", fg: "991b1b" }),
  product({ sku: "DCART-CG-002", name: "Spicy Sardines 155g", category: "Canned Goods", description: "Sardines in spicy tomato sauce for easy rice meals.", price: 26, stock: 82, unit: "can", bg: "fee2e2", fg: "991b1b" }),
  product({ sku: "DCART-CG-003", name: "Argentina Corned Beef 150g", category: "Canned Goods", description: "Small corned beef can for breakfast silog and sandwiches.", price: 42, stock: 65, unit: "can", bg: "fee2e2", fg: "991b1b" }),
  product({ sku: "DCART-CG-004", name: "Argentina Corned Beef 260g", category: "Canned Goods", description: "Family-size corned beef can for sauteed breakfast meals.", price: 72, stock: 48, unit: "can", bg: "fee2e2", fg: "991b1b" }),
  product({ sku: "DCART-CG-005", name: "Meat Loaf 150g", category: "Canned Goods", description: "Ready-to-fry meat loaf for fast ulam and baon.", price: 38, stock: 70, unit: "can", bg: "fee2e2", fg: "991b1b" }),
  product({ sku: "DCART-CG-006", name: "Meat Loaf 350g", category: "Canned Goods", description: "Larger meat loaf can for family breakfast or dinner.", price: 78, stock: 38, unit: "can", bg: "fee2e2", fg: "991b1b" }),
  product({ sku: "DCART-CG-007", name: "Tuna Flakes in Oil 155g", category: "Canned Goods", description: "Tuna flakes for sandwiches, pasta, and easy ulam.", price: 42, stock: 75, unit: "can", bg: "fee2e2", fg: "991b1b" }),
  product({ sku: "DCART-CG-008", name: "Tuna Hot and Spicy 155g", category: "Canned Goods", description: "Spicy tuna flakes for rice toppings and quick meals.", price: 44, stock: 64, unit: "can", bg: "fee2e2", fg: "991b1b" }),
  product({ sku: "DCART-CG-009", name: "Liver Spread 85g", category: "Canned Goods", description: "Small liver spread can for bread, crackers, and cooking sauces.", price: 32, stock: 55, unit: "can", bg: "fee2e2", fg: "991b1b" }),
  product({ sku: "DCART-CG-010", name: "Vienna Sausage 130g", category: "Canned Goods", description: "Canned sausage for quick breakfast plates and baon.", price: 46, stock: 52, unit: "can", bg: "fee2e2", fg: "991b1b" }),

  product({ sku: "DCART-ND-001", name: "Lucky Me Pancit Canton Chilimansi", category: "Noodles & Instant Food", description: "Classic calamansi and chili-flavored instant pancit canton.", price: 17, stock: 120, unit: "pack", bg: "fef9c3", fg: "854d0e" }),
  product({ sku: "DCART-ND-002", name: "Lucky Me Pancit Canton Kalamansi", category: "Noodles & Instant Food", description: "Tangy calamansi instant pancit canton for quick merienda.", price: 17, stock: 118, unit: "pack", bg: "fef9c3", fg: "854d0e" }),
  product({ sku: "DCART-ND-003", name: "Lucky Me Pancit Canton Sweet Spicy", category: "Noodles & Instant Food", description: "Sweet and spicy pancit canton for fast snacks.", price: 17, stock: 116, unit: "pack", bg: "fef9c3", fg: "854d0e" }),
  product({ sku: "DCART-ND-004", name: "Lucky Me Beef Mami", category: "Noodles & Instant Food", description: "Instant beef mami noodle soup for rainy-day meals.", price: 13, stock: 110, unit: "pack", bg: "fef9c3", fg: "854d0e" }),
  product({ sku: "DCART-ND-005", name: "Lucky Me Chicken Mami", category: "Noodles & Instant Food", description: "Instant chicken noodle soup with a comforting broth.", price: 13, stock: 112, unit: "pack", bg: "fef9c3", fg: "854d0e" }),
  product({ sku: "DCART-ND-006", name: "Payless Instant Mami Beef", category: "Noodles & Instant Food", description: "Affordable beef-flavored noodle soup pack.", price: 11, stock: 105, unit: "pack", bg: "fef9c3", fg: "854d0e" }),
  product({ sku: "DCART-ND-007", name: "Payless Instant Mami Chicken", category: "Noodles & Instant Food", description: "Budget chicken noodle soup for quick pantry meals.", price: 11, stock: 105, unit: "pack", bg: "fef9c3", fg: "854d0e" }),
  product({ sku: "DCART-ND-008", name: "Cup Noodles Seafood 40g", category: "Noodles & Instant Food", description: "Convenient seafood cup noodles for office or school breaks.", price: 34, stock: 60, unit: "cup", bg: "fef9c3", fg: "854d0e" }),
  product({ sku: "DCART-ND-009", name: "Cup Noodles Beef 40g", category: "Noodles & Instant Food", description: "Ready-in-minutes beef cup noodles.", price: 34, stock: 58, unit: "cup", bg: "fef9c3", fg: "854d0e" }),
  product({ sku: "DCART-ND-010", name: "Instant Arroz Caldo Mix", category: "Noodles & Instant Food", description: "Quick-cook arroz caldo meal cup for light meals.", price: 32, stock: 42, unit: "cup", bg: "fef9c3", fg: "854d0e" }),

  product({ sku: "DCART-CS-001", name: "Soy Sauce 200ml", category: "Condiments & Sauces", description: "Everyday toyo for dipping, marinades, and cooking.", price: 22, stock: 80, unit: "bottle", bg: "dcfce7", fg: "14532d" }),
  product({ sku: "DCART-CS-002", name: "Soy Sauce 1L", category: "Condiments & Sauces", description: "Value bottle of soy sauce for family cooking.", price: 78, stock: 42, unit: "bottle", wholesale: true, bg: "dcfce7", fg: "14532d" }),
  product({ sku: "DCART-CS-003", name: "Vinegar 200ml", category: "Condiments & Sauces", description: "Suka for dipping sauces, adobo, and marinades.", price: 18, stock: 82, unit: "bottle", bg: "dcfce7", fg: "14532d" }),
  product({ sku: "DCART-CS-004", name: "Datu Puti Vinegar 1L", category: "Condiments & Sauces", description: "Large vinegar bottle for kitchen staples and sauces.", price: 58, stock: 44, unit: "bottle", wholesale: true, bg: "dcfce7", fg: "14532d" }),
  product({ sku: "DCART-CS-005", name: "Silver Swan Soy Sauce 1L", category: "Condiments & Sauces", description: "Large soy sauce bottle for adobo and daily cooking.", price: 75, stock: 46, unit: "bottle", wholesale: true, bg: "dcfce7", fg: "14532d" }),
  product({ sku: "DCART-CS-006", name: "UFC Banana Ketchup 320g", category: "Condiments & Sauces", description: "Sweet Filipino-style ketchup for fried food and hotdogs.", price: 42, stock: 58, unit: "bottle", bg: "dcfce7", fg: "14532d" }),
  product({ sku: "DCART-CS-007", name: "Mang Tomas Lechon Sauce 330g", category: "Condiments & Sauces", description: "Savory lechon sauce for fried and roasted dishes.", price: 48, stock: 50, unit: "bottle", bg: "dcfce7", fg: "14532d" }),
  product({ sku: "DCART-CS-008", name: "Fish Sauce Patis 350ml", category: "Condiments & Sauces", description: "Patis for soups, dipping sauces, and seasoning.", price: 36, stock: 52, unit: "bottle", bg: "dcfce7", fg: "14532d" }),
  product({ sku: "DCART-CS-009", name: "Oyster Sauce 405g", category: "Condiments & Sauces", description: "Rich oyster sauce for stir-fry vegetables and meats.", price: 68, stock: 40, unit: "bottle", bg: "dcfce7", fg: "14532d" }),
  product({ sku: "DCART-CS-010", name: "Hot Sauce 150ml", category: "Condiments & Sauces", description: "Spicy sauce for fried chicken, noodles, and pulutan.", price: 38, stock: 45, unit: "bottle", bg: "dcfce7", fg: "14532d" }),

  product({ sku: "DCART-SC-001", name: "Magic Sarap Sachet 8g", category: "Seasonings & Cooking Ingredients", description: "All-in-one seasoning granules for soups, sauteed dishes, and ulam.", price: 7, stock: 160, unit: "sachet", bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-002", name: "Magic Sarap 50g Pack", category: "Seasonings & Cooking Ingredients", description: "Larger seasoning pack for regular home cooking.", price: 42, stock: 45, unit: "pack", wholesale: true, bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-003", name: "Aji-No-Moto MSG 50g", category: "Seasonings & Cooking Ingredients", description: "MSG seasoning for savory dishes and classic carinderia flavors.", price: 26, stock: 56, unit: "pack", bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-004", name: "Ground Black Pepper 25g", category: "Seasonings & Cooking Ingredients", description: "Paminta powder for marinades, soups, and fried dishes.", price: 32, stock: 42, unit: "pack", bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-005", name: "Iodized Salt 250g", category: "Seasonings & Cooking Ingredients", description: "Asin for everyday seasoning and cooking.", price: 18, stock: 70, unit: "pack", bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-006", name: "White Sugar 1kg", category: "Seasonings & Cooking Ingredients", description: "Granulated sugar for coffee, desserts, and cooking.", price: 82, stock: 45, unit: "pack", wholesale: true, bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-007", name: "Brown Sugar 1kg", category: "Seasonings & Cooking Ingredients", description: "Brown sugar for kakanin, sauces, and drinks.", price: 78, stock: 44, unit: "pack", wholesale: true, bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-008", name: "Cooking Oil 250ml", category: "Seasonings & Cooking Ingredients", description: "Small cooking oil bottle for frying and sauteing.", price: 52, stock: 60, unit: "bottle", bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-009", name: "Cooking Oil 1L", category: "Seasonings & Cooking Ingredients", description: "Family-size cooking oil bottle for daily kitchen use.", price: 145, stock: 36, unit: "bottle", wholesale: true, bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-010", name: "Garlic Powder 30g", category: "Seasonings & Cooking Ingredients", description: "Garlic powder for fried rice, marinades, and seasoning mixes.", price: 35, stock: 38, unit: "pack", bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-011", name: "Dried Laurel Leaves 10g", category: "Seasonings & Cooking Ingredients", description: "Laurel leaves for adobo, menudo, and stews.", price: 20, stock: 36, unit: "pack", bg: "ede9fe", fg: "4c1d95" }),
  product({ sku: "DCART-SC-012", name: "Curry Powder 30g", category: "Seasonings & Cooking Ingredients", description: "Curry powder for chicken curry and vegetable dishes.", price: 34, stock: 34, unit: "pack", bg: "ede9fe", fg: "4c1d95" }),

  product({ sku: "DCART-BV-001", name: "Bottled Water 500ml", category: "Beverages", description: "Clean bottled drinking water for school, work, and delivery orders.", price: 15, stock: 120, unit: "bottle", supplier: suppliers.beverages, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-002", name: "Bottled Water 1L", category: "Beverages", description: "Large bottled water for daily hydration.", price: 25, stock: 90, unit: "bottle", supplier: suppliers.beverages, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-003", name: "Cola Soft Drink 1.5L", category: "Beverages", description: "Family-size cola soft drink for meals and celebrations.", price: 82, stock: 48, unit: "bottle", supplier: suppliers.beverages, wholesale: true, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-004", name: "Lemon-Lime Soft Drink 1.5L", category: "Beverages", description: "Clear lemon-lime soda for parties and family meals.", price: 80, stock: 44, unit: "bottle", supplier: suppliers.beverages, wholesale: true, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-005", name: "Orange Soft Drink 1.5L", category: "Beverages", description: "Orange-flavored soft drink for sharing.", price: 78, stock: 42, unit: "bottle", supplier: suppliers.beverages, wholesale: true, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-006", name: "Powdered Juice Orange 25g", category: "Beverages", description: "Orange powdered juice sachet for one pitcher.", price: 12, stock: 130, unit: "sachet", supplier: suppliers.beverages, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-007", name: "Powdered Juice Mango 25g", category: "Beverages", description: "Mango powdered juice drink for family pitchers.", price: 12, stock: 125, unit: "sachet", supplier: suppliers.beverages, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-008", name: "3-in-1 Coffee Sachet", category: "Beverages", description: "Single-serve instant coffee mix for quick mornings.", price: 8, stock: 200, unit: "sachet", supplier: suppliers.beverages, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-009", name: "3-in-1 Coffee 10s Pack", category: "Beverages", description: "Value pack of instant coffee sachets for daily use.", price: 78, stock: 52, unit: "pack", supplier: suppliers.beverages, wholesale: true, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-010", name: "Milo Sachet 22g", category: "Beverages", description: "Chocolate malt drink sachet for kids and adults.", price: 12, stock: 160, unit: "sachet", supplier: suppliers.beverages, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-011", name: "Bear Brand Powdered Milk 33g", category: "Beverages", description: "Small powdered milk sachet for daily family needs.", price: 15, stock: 140, unit: "sachet", supplier: suppliers.beverages, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-012", name: "Energen Vanilla Sachet", category: "Beverages", description: "Cereal milk drink sachet for quick breakfast.", price: 10, stock: 145, unit: "sachet", supplier: suppliers.beverages, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-013", name: "Black Tea Bags 25s", category: "Beverages", description: "Tea bags for hot tea, iced tea, and light drinks.", price: 68, stock: 34, unit: "box", supplier: suppliers.beverages, wholesale: true, bg: "dbeafe", fg: "1e3a8a" }),
  product({ sku: "DCART-BV-014", name: "Iced Tea Powder 1L Pack", category: "Beverages", description: "Powdered iced tea mix good for one liter.", price: 22, stock: 75, unit: "pack", supplier: suppliers.beverages, bg: "dbeafe", fg: "1e3a8a" }),

  product({ sku: "DCART-AB-001", name: "San Miguel Beer Pale Pilsen 330ml", category: "Alcoholic Beverages", description: "Local beer bottle for legal-age customers.", price: 58, stock: 48, unit: "bottle", supplier: suppliers.beverages, ageRestricted: true, bg: "e0e7ff", fg: "312e81" }),
  product({ sku: "DCART-AB-002", name: "San Miguel Light 330ml", category: "Alcoholic Beverages", description: "Light local beer bottle for legal-age customers.", price: 60, stock: 42, unit: "bottle", supplier: suppliers.beverages, ageRestricted: true, bg: "e0e7ff", fg: "312e81" }),
  product({ sku: "DCART-AB-003", name: "Red Horse Beer 500ml", category: "Alcoholic Beverages", description: "Strong beer bottle for legal-age customers.", price: 72, stock: 40, unit: "bottle", supplier: suppliers.beverages, ageRestricted: true, bg: "e0e7ff", fg: "312e81" }),
  product({ sku: "DCART-AB-004", name: "Gin 350ml", category: "Alcoholic Beverages", description: "Gin bottle for legal-age customers only.", price: 95, stock: 26, unit: "bottle", supplier: suppliers.beverages, ageRestricted: true, bg: "e0e7ff", fg: "312e81" }),
  product({ sku: "DCART-AB-005", name: "Alfonso Light Brandy 700ml", category: "Alcoholic Beverages", description: "Brandy bottle for legal-age customers and future age-gated checkout.", price: 385, stock: 14, unit: "bottle", supplier: suppliers.beverages, ageRestricted: true, bg: "e0e7ff", fg: "312e81" }),
  product({ sku: "DCART-AB-006", name: "Emperador Brandy 750ml", category: "Alcoholic Beverages", description: "Brandy bottle for legal-age customers only.", price: 180, stock: 18, unit: "bottle", supplier: suppliers.beverages, ageRestricted: true, bg: "e0e7ff", fg: "312e81" }),
  product({ sku: "DCART-AB-007", name: "Tanduay Rum 750ml", category: "Alcoholic Beverages", description: "Rum bottle for legal-age customers only.", price: 165, stock: 20, unit: "bottle", supplier: suppliers.beverages, ageRestricted: true, bg: "e0e7ff", fg: "312e81" }),
  product({ sku: "DCART-AB-008", name: "Beer Case 24 Bottles", category: "Alcoholic Beverages", description: "Case quantity for legal-age bulk buyers.", price: 1320, stock: 6, unit: "case", supplier: suppliers.beverages, reorderPoint: 2, reorderQty: 4, wholesale: true, ageRestricted: true, bg: "e0e7ff", fg: "312e81" }),

  product({ sku: "DCART-PC-001", name: "Shampoo Sachet Anti-Dandruff", category: "Personal Care", description: "Single-use shampoo sachet for daily hair care.", price: 8, stock: 170, unit: "sachet", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-002", name: "Shampoo Sachet Smooth Care", category: "Personal Care", description: "Smooth-care shampoo sachet for regular use.", price: 8, stock: 168, unit: "sachet", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-003", name: "Conditioner Sachet", category: "Personal Care", description: "Conditioner sachet for soft and manageable hair.", price: 9, stock: 150, unit: "sachet", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-004", name: "Safeguard Soap Bar 60g", category: "Personal Care", description: "Antibacterial bath soap bar for everyday hygiene.", price: 35, stock: 72, unit: "piece", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-005", name: "Safeguard Soap Bar 130g", category: "Personal Care", description: "Large antibacterial soap bar for family use.", price: 72, stock: 48, unit: "piece", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-006", name: "Green Cross Alcohol 250ml", category: "Personal Care", description: "Ethyl alcohol bottle for hand and surface sanitation.", price: 58, stock: 56, unit: "bottle", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-007", name: "Green Cross Alcohol 500ml", category: "Personal Care", description: "Larger ethyl alcohol bottle for home hygiene.", price: 105, stock: 38, unit: "bottle", supplier: suppliers.personal, wholesale: true, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-008", name: "Colgate Toothpaste 35ml", category: "Personal Care", description: "Small toothpaste tube for travel and daily brushing.", price: 42, stock: 60, unit: "tube", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-009", name: "Colgate Toothpaste 100ml", category: "Personal Care", description: "Family toothpaste tube for daily oral care.", price: 98, stock: 36, unit: "tube", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-010", name: "Adult Toothbrush", category: "Personal Care", description: "Medium-bristle toothbrush for everyday oral care.", price: 35, stock: 65, unit: "piece", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-011", name: "Deodorant Sachet", category: "Personal Care", description: "Affordable deodorant sachet for daily freshness.", price: 14, stock: 95, unit: "sachet", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),
  product({ sku: "DCART-PC-012", name: "Cotton Buds 100s", category: "Personal Care", description: "Cotton buds pack for hygiene and household use.", price: 38, stock: 48, unit: "pack", supplier: suppliers.personal, bg: "fce7f3", fg: "831843" }),

  product({ sku: "DCART-LC-001", name: "Powder Detergent Sachet 65g", category: "Laundry & Cleaning", description: "Small powder detergent sachet for handwashing clothes.", price: 9, stock: 150, unit: "sachet", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-002", name: "Surf Powder Detergent 70g", category: "Laundry & Cleaning", description: "Detergent sachet for everyday laundry.", price: 12, stock: 140, unit: "sachet", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-003", name: "Ariel Powder Detergent 70g", category: "Laundry & Cleaning", description: "Laundry powder sachet for tough dirt and stains.", price: 16, stock: 120, unit: "sachet", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-004", name: "Tide Powder Detergent 70g", category: "Laundry & Cleaning", description: "Powder detergent sachet for bright laundry.", price: 16, stock: 118, unit: "sachet", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-005", name: "Zonrox Bleach 250ml", category: "Laundry & Cleaning", description: "Bleach for laundry whites and household cleaning.", price: 38, stock: 58, unit: "bottle", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-006", name: "Fabric Conditioner Sachet", category: "Laundry & Cleaning", description: "Single-use fabric conditioner sachet for soft, fragrant laundry.", price: 9, stock: 140, unit: "sachet", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-007", name: "Dishwashing Liquid 250ml", category: "Laundry & Cleaning", description: "Lemon dishwashing liquid bottle for daily kitchen cleanup.", price: 48, stock: 62, unit: "bottle", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-008", name: "Dishwashing Liquid 1L", category: "Laundry & Cleaning", description: "Value refill bottle for household dishwashing.", price: 118, stock: 30, unit: "bottle", supplier: suppliers.household, wholesale: true, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-009", name: "Dishwashing Paste 200g", category: "Laundry & Cleaning", description: "Dishwashing paste tub for plates, pans, and utensils.", price: 32, stock: 52, unit: "tub", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-010", name: "Kitchen Sponge 3s", category: "Laundry & Cleaning", description: "Pack of cleaning sponges for dishes and surfaces.", price: 35, stock: 48, unit: "pack", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),
  product({ sku: "DCART-LC-011", name: "Multi-Purpose Cleaner 500ml", category: "Laundry & Cleaning", description: "All-around cleaner for floors, counters, and household surfaces.", price: 95, stock: 28, unit: "bottle", supplier: suppliers.household, bg: "ccfbf1", fg: "134e4a" }),

  product({ sku: "DCART-HH-001", name: "Bathroom Tissue 4 Rolls", category: "Household Essentials", description: "Soft bathroom tissue pack for family bathrooms.", price: 72, stock: 42, unit: "pack", supplier: suppliers.household, bg: "e5e7eb", fg: "111827" }),
  product({ sku: "DCART-HH-002", name: "Facial Tissue 200 Pulls", category: "Household Essentials", description: "Facial tissue box for bedrooms, counters, and offices.", price: 68, stock: 38, unit: "box", supplier: suppliers.household, bg: "e5e7eb", fg: "111827" }),
  product({ sku: "DCART-HH-003", name: "Garbage Bags Medium 10s", category: "Household Essentials", description: "Medium black trash bags for kitchen and room bins.", price: 55, stock: 45, unit: "pack", supplier: suppliers.household, bg: "e5e7eb", fg: "111827" }),
  product({ sku: "DCART-HH-004", name: "Plastic Cups 50s", category: "Household Essentials", description: "Disposable plastic cups for parties and sari-sari packs.", price: 58, stock: 40, unit: "pack", supplier: suppliers.household, wholesale: true, bg: "e5e7eb", fg: "111827" }),
  product({ sku: "DCART-HH-005", name: "Plastic Spoons and Forks 50s", category: "Household Essentials", description: "Disposable utensils for takeout, parties, and packed meals.", price: 62, stock: 38, unit: "pack", supplier: suppliers.household, wholesale: true, bg: "e5e7eb", fg: "111827" }),
  product({ sku: "DCART-HH-006", name: "Aluminum Foil Roll", category: "Household Essentials", description: "Foil roll for baking, wrapping, and food storage.", price: 85, stock: 28, unit: "roll", supplier: suppliers.household, bg: "e5e7eb", fg: "111827" }),
  product({ sku: "DCART-HH-007", name: "Food Containers 10s", category: "Household Essentials", description: "Clear food containers for leftovers and baon.", price: 88, stock: 32, unit: "pack", supplier: suppliers.household, wholesale: true, bg: "e5e7eb", fg: "111827" }),
  product({ sku: "DCART-HH-008", name: "Candles 6s", category: "Household Essentials", description: "Household candles for emergency lighting.", price: 35, stock: 54, unit: "pack", supplier: suppliers.household, bg: "e5e7eb", fg: "111827" }),
  product({ sku: "DCART-HH-009", name: "Matches 10 Boxes", category: "Household Essentials", description: "Matchbox bundle for kitchen and emergency use.", price: 30, stock: 50, unit: "pack", supplier: suppliers.household, bg: "e5e7eb", fg: "111827" }),
  product({ sku: "DCART-HH-010", name: "AA Batteries 2s", category: "Household Essentials", description: "Pair of AA batteries for remotes, clocks, and small devices.", price: 55, stock: 44, unit: "pack", supplier: suppliers.household, bg: "e5e7eb", fg: "111827" }),

  product({ sku: "DCART-CW-001", name: "Maxx Candy 50s Pack", category: "Candies & Sweets", description: "Menthol candy pack for resale bowls and family treats.", price: 55, stock: 42, unit: "pack", wholesale: true, bg: "ffe4e6", fg: "9f1239" }),
  product({ sku: "DCART-CW-002", name: "Mentos Roll", category: "Candies & Sweets", description: "Chewy mint candy roll for quick sweets.", price: 22, stock: 65, unit: "piece", bg: "ffe4e6", fg: "9f1239" }),
  product({ sku: "DCART-CW-003", name: "Cloud 9 Chocolate Bar", category: "Candies & Sweets", description: "Chocolate bar with caramel and nougat for merienda.", price: 15, stock: 100, unit: "piece", bg: "ffe4e6", fg: "9f1239" }),
  product({ sku: "DCART-CW-004", name: "Choc Nut 24s Pack", category: "Candies & Sweets", description: "Peanut chocolate candy pack for sharing and resale.", price: 92, stock: 34, unit: "pack", wholesale: true, bg: "ffe4e6", fg: "9f1239" }),
  product({ sku: "DCART-CW-005", name: "Lollipops 20s Pack", category: "Candies & Sweets", description: "Assorted lollipops for kids and sari-sari displays.", price: 70, stock: 36, unit: "pack", wholesale: true, bg: "ffe4e6", fg: "9f1239" }),
  product({ sku: "DCART-CW-006", name: "Marshmallows 100g", category: "Candies & Sweets", description: "Soft marshmallow pack for snacks and dessert toppings.", price: 38, stock: 48, unit: "pack", bg: "ffe4e6", fg: "9f1239" }),
  product({ sku: "DCART-CW-007", name: "Gummy Candies 100g", category: "Candies & Sweets", description: "Assorted gummy candy pack for sweet cravings.", price: 45, stock: 46, unit: "pack", bg: "ffe4e6", fg: "9f1239" }),
  product({ sku: "DCART-CW-008", name: "Assorted Candies 100s Jar Refill", category: "Candies & Sweets", description: "Mixed candy pack for counters, parties, and small-store resale.", price: 120, stock: 24, unit: "pack", supplier: suppliers.default, wholesale: true, bg: "ffe4e6", fg: "9f1239" }),
  product({ sku: "DCART-CW-009", name: "Chocolate Wafer Pack", category: "Candies & Sweets", description: "Chocolate wafer snack pack for baon and merienda.", price: 48, stock: 44, unit: "pack", bg: "ffe4e6", fg: "9f1239" }),

  product({ sku: "DCART-BK-001", name: "Baby Diapers Small 10s", category: "Baby & Kids", description: "Small diaper pack for daily baby care.", price: 115, stock: 28, unit: "pack", supplier: suppliers.personal, bg: "cffafe", fg: "155e75" }),
  product({ sku: "DCART-BK-002", name: "Baby Diapers Medium 10s", category: "Baby & Kids", description: "Medium diaper pack for toddlers.", price: 125, stock: 30, unit: "pack", supplier: suppliers.personal, bg: "cffafe", fg: "155e75" }),
  product({ sku: "DCART-BK-003", name: "Baby Diapers Large 10s", category: "Baby & Kids", description: "Large diaper pack for toddlers and growing babies.", price: 135, stock: 28, unit: "pack", supplier: suppliers.personal, bg: "cffafe", fg: "155e75" }),
  product({ sku: "DCART-BK-004", name: "Baby Wipes 80 Pulls", category: "Baby & Kids", description: "Gentle baby wipes for diaper changes and quick cleanups.", price: 85, stock: 34, unit: "pack", supplier: suppliers.personal, bg: "cffafe", fg: "155e75" }),
  product({ sku: "DCART-BK-005", name: "Baby Powder 50g", category: "Baby & Kids", description: "Small baby powder bottle for daily freshness.", price: 55, stock: 30, unit: "bottle", supplier: suppliers.personal, bg: "cffafe", fg: "155e75" }),
  product({ sku: "DCART-BK-006", name: "Baby Soap Bar 90g", category: "Baby & Kids", description: "Mild baby soap bar for gentle bathing.", price: 48, stock: 32, unit: "piece", supplier: suppliers.personal, bg: "cffafe", fg: "155e75" })
];

const createExpiryDate = (days) => {
  if (!days) return null;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
};

async function seedUsersAndStore() {
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
}

async function seedCategories() {
  const categoryColumns = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'categories'
      AND column_name IN ('description', 'image', 'isActive')
  `;
  const availableCategoryColumns = new Set(categoryColumns.map((column) => column.column_name));
  const supportsDescription = availableCategoryColumns.has("description");
  const supportsImage = availableCategoryColumns.has("image");
  const supportsStatus = availableCategoryColumns.has("isActive");
  const seedableCategories = supportsStatus
    ? categories
    : categories.filter((category) => category.name !== "Frozen / Chilled Goods");

  for (const category of seedableCategories) {
    if (supportsDescription && supportsImage && supportsStatus) {
      await prisma.$executeRaw`
        INSERT INTO "categories" ("name", "description", "image", "isActive", "updatedAt")
        VALUES (${category.name}, ${category.description}, ${category.image}, ${category.isActive}, NOW())
        ON CONFLICT ("name") DO UPDATE SET
          "description" = EXCLUDED."description",
          "image" = EXCLUDED."image",
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW()
      `;
    } else if (supportsDescription && supportsImage) {
      await prisma.$executeRaw`
        INSERT INTO "categories" ("name", "description", "image", "updatedAt")
        VALUES (${category.name}, ${category.description}, ${category.image}, NOW())
        ON CONFLICT ("name") DO UPDATE SET
          "description" = EXCLUDED."description",
          "image" = EXCLUDED."image",
          "updatedAt" = NOW()
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "categories" ("name", "updatedAt")
        VALUES (${category.name}, NOW())
        ON CONFLICT ("name") DO NOTHING
      `;
    }
  }

  const allCategories = await prisma.$queryRaw`SELECT "id", "name" FROM "categories"`;
  return new Map(allCategories.map((category) => [category.name, category.id]));
}

async function ensureSeedInventory(tx, createdProduct, item) {
  const inventoryItem = await tx.inventoryItem.findUnique({
    where: { productId: createdProduct.id },
    include: { batches: true }
  });
  const seedBatchCode = `SEED-${item.sku}`;

  if (!inventoryItem) {
    const newInventoryItem = await tx.inventoryItem.create({
      data: {
        productId: createdProduct.id,
        onHandQty: item.stock,
        reservedQty: 0,
        availableQty: item.stock,
        reorderPoint: item.reorderPoint,
        reorderQty: item.reorderQty,
        safetyStockQty: Math.max(0, Math.floor(item.reorderPoint / 2))
      }
    });

    const batch = await tx.inventoryBatch.create({
      data: {
        inventoryItemId: newInventoryItem.id,
        batchCode: seedBatchCode,
        supplier: item.supplier,
        receivedAt: new Date(),
        expiresAt: createExpiryDate(item.expiresInDays),
        unitCost: item.unitCost,
        receivedQty: item.stock,
        remainingQty: item.stock,
        status: "ACTIVE"
      }
    });

    await tx.inventoryMovement.create({
      data: {
        productId: createdProduct.id,
        batchId: batch.id,
        type: "RECEIVE",
        quantityDelta: item.stock,
        referenceType: "seed",
        referenceId: item.sku,
        reason: "Initial Decolores Cart catalog seed."
      }
    });

    return tx.product.update({
      where: { id: createdProduct.id },
      data: { stock: item.stock }
    });
  }

  await tx.inventoryItem.update({
    where: { id: inventoryItem.id },
    data: {
      reorderPoint: item.reorderPoint,
      reorderQty: item.reorderQty,
      safetyStockQty: Math.max(0, Math.floor(item.reorderPoint / 2))
    }
  });

  const existingSeedBatch = inventoryItem.batches.find((batch) => batch.batchCode === seedBatchCode);
  if (existingSeedBatch) {
    await tx.inventoryBatch.update({
      where: { id: existingSeedBatch.id },
      data: {
        supplier: item.supplier,
        unitCost: item.unitCost,
        expiresAt: createExpiryDate(item.expiresInDays)
      }
    });
    return createdProduct;
  }

  const batch = await tx.inventoryBatch.create({
    data: {
      inventoryItemId: inventoryItem.id,
      batchCode: seedBatchCode,
      supplier: item.supplier,
      receivedAt: new Date(),
      expiresAt: createExpiryDate(item.expiresInDays),
      unitCost: item.unitCost,
      receivedQty: item.stock,
      remainingQty: item.stock,
      status: "ACTIVE"
    }
  });

  await tx.inventoryItem.update({
    where: { id: inventoryItem.id },
    data: {
      onHandQty: { increment: item.stock },
      availableQty: { increment: item.stock }
    }
  });

  await tx.inventoryMovement.create({
    data: {
      productId: createdProduct.id,
      batchId: batch.id,
      type: "RECEIVE",
      quantityDelta: item.stock,
      referenceType: "seed",
      referenceId: item.sku,
      reason: "Additional Decolores Cart seed batch."
    }
  });

  const refreshedInventory = await tx.inventoryItem.findUnique({
    where: { id: inventoryItem.id }
  });

  return tx.product.update({
    where: { id: createdProduct.id },
    data: { stock: refreshedInventory.availableQty }
  });
}

async function seedProducts(categoryMap) {
  let createdCount = 0;
  let updatedCount = 0;

  for (const item of products) {
    const categoryId = categoryMap.get(item.category);
    if (!categoryId) {
      throw new Error(`Missing category for product ${item.name}: ${item.category}`);
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: {
          OR: [
            { barcode: item.sku },
            { name: item.name }
          ]
        }
      });

      const data = {
        name: item.name,
        description: item.description,
        image: item.image,
        price: item.price,
        unit: item.unit,
        weight: item.weight,
        barcode: item.sku,
        categoryId
      };

      const savedProduct = existing
        ? await tx.product.update({
            where: { id: existing.id },
            data
          })
        : await tx.product.create({
            data: {
              ...data,
              stock: item.stock
            }
          });

      if (existing) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }

      await ensureSeedInventory(tx, savedProduct, item);
    });
  }

  return { createdCount, updatedCount };
}

async function seedDeliverySlots() {
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
}

async function main() {
  await seedUsersAndStore();
  const categoryMap = await seedCategories();
  const { createdCount, updatedCount } = await seedProducts(categoryMap);
  await seedDeliverySlots();

  console.log(
    `Seeded Decolores Cart catalog: ${categories.length} categories, ${products.length} products (${createdCount} created, ${updatedCount} updated), supplier batches, users, store geofence, and delivery slots. Run id ${randomUUID().slice(0, 8)}.`
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
