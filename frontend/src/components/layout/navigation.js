import {
  Bell,
  Boxes,
  ChartColumn,
  ClipboardList,
  House,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Truck,
  UserRound,
  Users
} from "lucide-react";

export const adminNavigation = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Boxes },
  { to: "/admin/inventory", label: "Inventory", icon: ShoppingBasket },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/customers", label: "Customers", icon: Users, comingSoon: true },
  { to: "/admin/suppliers", label: "Suppliers", icon: Truck, comingSoon: true },
  { to: "/admin/analytics", label: "Sales Analytics", icon: ChartColumn, comingSoon: true },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/settings", label: "Settings", icon: Settings, comingSoon: true }
];

export const staffNavigation = [
  { to: "/picker", label: "Fulfillment", icon: ClipboardList },
  { to: "/products", label: "Catalog", icon: Package }
];

export const customerNavigation = [
  { to: "/home", label: "Home", icon: House },
  { to: "/products", label: "Shop", icon: ShoppingBasket },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/account", label: "Account", icon: UserRound }
];

export const routeTitles = {
  "/admin": {
    eyebrow: "Operations",
    title: "Executive dashboard",
    description: "Daily trading health, fulfillment pace, and runtime visibility."
  },
  "/admin/products": {
    eyebrow: "Catalog",
    title: "Products",
    description: "Manage product details, pricing, and stock-ready storefront records."
  },
  "/admin/categories": {
    eyebrow: "Catalog",
    title: "Categories",
    description: "Category management is reserved for the next rollout."
  },
  "/admin/inventory": {
    eyebrow: "Stock",
    title: "Inventory",
    description: "Receiving, stock health, near-expiry risk, and reservation cleanup."
  },
  "/admin/orders": {
    eyebrow: "Fulfillment",
    title: "Orders and dispatch",
    description: "Packing, staging, rider assignment, refunds, and delivery execution."
  },
  "/admin/customers": {
    eyebrow: "CRM",
    title: "Customers",
    description: "Customer operations are planned for a dedicated phase."
  },
  "/admin/suppliers": {
    eyebrow: "Procurement",
    title: "Suppliers",
    description: "Supplier records and purchasing workflows are planned next."
  },
  "/admin/analytics": {
    eyebrow: "Insights",
    title: "Sales analytics",
    description: "Advanced commercial analytics will be expanded in a future release."
  },
  "/admin/notifications": {
    eyebrow: "Comms",
    title: "Notifications and audit",
    description: "Delivery visibility, retry recovery, and operational traceability."
  },
  "/admin/settings": {
    eyebrow: "Workspace",
    title: "Settings",
    description: "Workspace and policy settings will land in the next phase."
  },
  "/picker": {
    eyebrow: "Fulfillment",
    title: "Picker workflow",
    description: "Claim, pick, substitute, and update live delivery location."
  },
  "/products": {
    eyebrow: "Storefront",
    title: "Fresh grocery essentials",
    description: "Browse, search, and add groceries to your cart without breaking your flow."
  },
  "/home": {
    eyebrow: "Storefront",
    title: "Customer home",
    description: "Shop faster with search, categories, active orders, and quick cart access."
  },
  "/cart": {
    eyebrow: "Checkout",
    title: "Your cart",
    description: "Review your basket before checkout."
  },
  "/orders": {
    eyebrow: "Customer",
    title: "Your orders",
    description: "Track substitutions, delivery progress, and receipts."
  },
  "/account": {
    eyebrow: "Customer",
    title: "Your account",
    description: "Quick access to your orders, cart, and sign-in details."
  }
};
