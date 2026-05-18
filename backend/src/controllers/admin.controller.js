import { AdminService } from "../services/admin.service.js";

const adminService = new AdminService();

export const getDashboard = async (_req, res) => {
  const dashboard = await adminService.getDashboardMetrics();
  res.status(200).json({ dashboard });
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
