import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell.jsx";
import { LoadingState } from "./components/common/LoadingState.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";

const AdminInventoryPage = lazy(() => import("./pages/AdminInventoryPage.jsx").then((module) => ({ default: module.AdminInventoryPage })));
const AdminNotificationsPage = lazy(() => import("./pages/AdminNotificationsPage.jsx").then((module) => ({ default: module.AdminNotificationsPage })));
const AdminOrdersPage = lazy(() => import("./pages/AdminOrdersPage.jsx").then((module) => ({ default: module.AdminOrdersPage })));
const AdminOverviewPage = lazy(() => import("./pages/AdminOverviewPage.jsx").then((module) => ({ default: module.AdminOverviewPage })));
const AdminPlaceholderPage = lazy(() => import("./pages/AdminPlaceholderPage.jsx").then((module) => ({ default: module.AdminPlaceholderPage })));
const AdminProductsPage = lazy(() => import("./pages/AdminProductsPage.jsx").then((module) => ({ default: module.AdminProductsPage })));
const AccountPage = lazy(() => import("./pages/AccountPage.jsx").then((module) => ({ default: module.AccountPage })));
const CartPage = lazy(() => import("./pages/CartPage.jsx").then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage.jsx").then((module) => ({ default: module.CheckoutPage })));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx").then((module) => ({ default: module.ForgotPasswordPage })));
const HomePage = lazy(() => import("./pages/HomePage.jsx").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx").then((module) => ({ default: module.LoginPage })));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage.jsx").then((module) => ({ default: module.OrderTrackingPage })));
const OrdersPage = lazy(() => import("./pages/OrdersPage.jsx").then((module) => ({ default: module.OrdersPage })));
const PaymentCancelledPage = lazy(() => import("./pages/PaymentCancelledPage.jsx").then((module) => ({ default: module.PaymentCancelledPage })));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage.jsx").then((module) => ({ default: module.PaymentSuccessPage })));
const PickerDashboardPage = lazy(() => import("./pages/PickerDashboardPage.jsx").then((module) => ({ default: module.PickerDashboardPage })));
const ProductsPage = lazy(() => import("./pages/ProductsPage.jsx").then((module) => ({ default: module.ProductsPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx").then((module) => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx").then((module) => ({ default: module.ResetPasswordPage })));

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;
    if (user?.role === "STAFF") return <Navigate to="/picker" replace />;
    return <Navigate to="/home" replace />;
  }

  return children;
}

function RoleHomeRedirect() {
  const { user } = useAuth();

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role === "STAFF") {
    return <Navigate to="/picker" replace />;
  }

  return <Navigate to="/home" replace />;
}

function RouteLoader({ children }) {
  return <Suspense fallback={<LoadingState label="Loading workspace..." />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <RouteLoader>
              <LoginPage />
            </RouteLoader>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RouteLoader>
              <RegisterPage />
            </RouteLoader>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <RouteLoader>
              <ForgotPasswordPage />
            </RouteLoader>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnlyRoute>
            <RouteLoader>
              <ResetPasswordPage />
            </RouteLoader>
          </PublicOnlyRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/payment/success" element={<RouteLoader><PaymentSuccessPage /></RouteLoader>} />
        <Route path="/payment/cancelled" element={<RouteLoader><PaymentCancelledPage /></RouteLoader>} />

        <Route
          path="/home"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <RouteLoader>
                <HomePage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute roles={["CUSTOMER", "STAFF"]}>
              <RouteLoader>
                <ProductsPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <RouteLoader>
                <CartPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <RouteLoader>
                <CheckoutPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <RouteLoader>
                <OrdersPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <RouteLoader>
                <OrderTrackingPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <RouteLoader>
                <AccountPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminOverviewPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminProductsPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminPlaceholderPage
                  eyebrow="Catalog"
                  title="Categories"
                  description="A dedicated categories workspace is planned in the next phase."
                />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminInventoryPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminOrdersPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminPlaceholderPage
                  eyebrow="CRM"
                  title="Customers"
                  description="Customer ops will get a dedicated workspace in the next phase."
                />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/suppliers"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminPlaceholderPage
                  eyebrow="Procurement"
                  title="Suppliers"
                  description="Supplier management is reserved for the next module expansion."
                />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminPlaceholderPage
                  eyebrow="Insights"
                  title="Sales analytics"
                  description="Advanced reporting has a dedicated home here and will be expanded next."
                />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminNotificationsPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RouteLoader>
                <AdminPlaceholderPage
                  eyebrow="Workspace"
                  title="Settings"
                  description="Workspace settings and policies are planned for the next release."
                />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="/picker"
          element={
            <ProtectedRoute roles={["STAFF", "ADMIN"]}>
              <RouteLoader>
                <PickerDashboardPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
