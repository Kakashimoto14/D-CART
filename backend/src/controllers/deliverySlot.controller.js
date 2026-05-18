import { DeliverySlotService } from "../services/deliverySlot.service.js";

const deliverySlotService = new DeliverySlotService();

export const getAvailableSlots = async (req, res) => {
  const { from, to, deliveryType } = req.query;
  const slots = await deliverySlotService.getAvailableSlots(from, to, { deliveryType });
  res.json(slots);
};

export const getAllSlots = async (_req, res) => {
  const slots = await deliverySlotService.getAllSlots();
  res.json(slots);
};

export const generateSlots = async (req, res) => {
  const { date, slots } = req.body;
  const created = await deliverySlotService.generateSlots(date, slots);
  res.json(created);
};
