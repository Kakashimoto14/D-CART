const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const apiAssetBaseUrl = API_BASE_URL.replace(/\/api\/?$/, "");

const CATEGORY_FALLBACKS = {
  "Rice & Grains": "/images/product-fallbacks/rice.svg",
  "Rice & Pantry": "/images/product-fallbacks/rice.svg",
  "Snacks / Chichirya": "/images/product-fallbacks/snacks.svg",
  Snacks: "/images/product-fallbacks/snacks.svg",
  "Canned Goods": "/images/product-fallbacks/canned-goods.svg",
  "Noodles & Instant Food": "/images/product-fallbacks/noodles.svg",
  "Condiments & Sauces": "/images/product-fallbacks/condiments.svg",
  "Seasonings & Cooking Ingredients": "/images/product-fallbacks/seasonings.svg",
  Beverages: "/images/product-fallbacks/beverages.svg",
  "Alcoholic Beverages": "/images/product-fallbacks/alcohol.svg",
  "Personal Care": "/images/product-fallbacks/personal-care.svg",
  "Laundry & Cleaning": "/images/product-fallbacks/cleaning.svg",
  Household: "/images/product-fallbacks/household.svg",
  "Household Essentials": "/images/product-fallbacks/household.svg",
  "Candies & Sweets": "/images/product-fallbacks/candies.svg",
  "Baby & Kids": "/images/product-fallbacks/baby.svg",
  "Frozen / Chilled Goods": "/images/product-fallbacks/frozen.svg",
  "Dairy & Frozen": "/images/product-fallbacks/frozen.svg",
  "Fruits & Vegetables": "/images/product-fallbacks/grocery.svg",
  "Meat & Seafood": "/images/product-fallbacks/grocery.svg"
};

const DEFAULT_FALLBACK = "/images/product-fallbacks/grocery.svg";

export const isGeneratedPlaceholderImage = (image = "") =>
  /placehold\.co|placeholder/i.test(String(image));

export const getCategoryFallbackImage = (categoryName) =>
  CATEGORY_FALLBACKS[categoryName] || DEFAULT_FALLBACK;

export const resolveImageUrl = (image) => {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/uploads/")) return `${apiAssetBaseUrl}${image}`;
  return image;
};

export const getProductImageUrl = (product, { forceFallback = false } = {}) => {
  const image = product?.image || "";

  if (!forceFallback && image && !isGeneratedPlaceholderImage(image)) {
    return resolveImageUrl(image);
  }

  return getCategoryFallbackImage(product?.category?.name);
};
