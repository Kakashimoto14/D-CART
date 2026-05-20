import { AdminService } from "../services/admin.service.js";

const adminService = new AdminService();

export const getDashboard = async (_req, res) => {
  const dashboard = await adminService.getDashboardMetrics();
  res.status(200).json({ dashboard });
};

export const listCustomers = async (req, res) => {
  const customers = await adminService.listCustomers(req.query);
  res.status(200).json({ customers });
};

export const listSuppliers = async (req, res) => {
  const suppliers = await adminService.listSuppliers(req.query);
  res.status(200).json({ suppliers });
};

export const getSalesAnalytics = async (req, res) => {
  const analytics = await adminService.getSalesAnalytics(req.query);
  res.status(200).json({ analytics });
};

export const getNotifications = async (req, res) => {
  const notifications = await adminService.getNotifications(req.user?.id);
  res.status(200).json({ notifications });
};

export const markNotificationRead = async (req, res) => {
  const result = await adminService.markNotificationRead(
    req.user?.id,
    req.params.notificationId
  );
  res.status(200).json(result);
};

export const markAllNotificationsRead = async (req, res) => {
  const result = await adminService.markAllNotificationsRead(req.user?.id);
  res.status(200).json(result);
};

export const getSettings = async (_req, res) => {
  const settings = await adminService.getSettings();
  res.status(200).json({ settings });
};

export const updateSettings = async (req, res) => {
  const settings = await adminService.updateSettings(req.body, req.user?.id);
  res.status(200).json({ settings });
};

export const globalSearch = async (req, res) => {
  const results = await adminService.globalSearch(req.query.q);
  res.status(200).json({ results });
};

export const completeRefund = async (req, res) => {
  const order = await adminService.completeRefund(Number(req.params.orderId));
  res.status(200).json({ order });
};

export const retryNotification = async (req, res) => {
  const notification = await adminService.retryNotification(Number(req.params.notificationLogId));
  res.status(200).json({ notification });
};

export const createStaff = async (req, res) => {
  const staff = await adminService.createStaff(req.body);
  res.status(201).json({ staff });
};
