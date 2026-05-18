import { InventoryService } from "../services/inventory.service.js";

const inventoryService = new InventoryService();

export const listInventory = async (req, res) => {
  const result = await inventoryService.listInventory(req.query);
  res.status(200).json(result);
};

export const getInventoryItem = async (req, res) => {
  const inventory = await inventoryService.getInventoryItemByProductId(Number(req.params.productId));
  res.status(200).json({ inventory });
};

export const receiveStock = async (req, res) => {
  const result = await inventoryService.receiveStock(
    Number(req.params.productId),
    req.body,
    req.user
  );
  res.status(201).json({ inventory: result });
};

export const getInventoryAlerts = async (req, res) => {
  const alerts = await inventoryService.getInventoryAlerts(req.query);
  res.status(200).json({ alerts });
};

export const cleanupExpiredReservations = async (req, res) => {
  const result = await inventoryService.cleanupExpiredReservations({
    actorUserId: req.user?.id || null
  });
  res.status(200).json({ cleanup: result });
};
