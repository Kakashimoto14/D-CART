import { PickerService } from "../services/picker.service.js";

const pickerService = new PickerService();

export const getPickerOrders = async (req, res) => {
  const orders = await pickerService.getPickerOrders(req.user.id);
  res.json(orders);
};

export const claimOrder = async (req, res) => {
  const order = await pickerService.claimOrder(req.user.id, Number(req.params.orderId));
  res.json(order);
};

export const pickItem = async (req, res) => {
  const result = await pickerService.pickItem(
    req.user.id,
    Number(req.params.orderId),
    Number(req.params.itemId),
    req.body
  );
  res.json(result);
};

export const markItemUnavailable = async (req, res) => {
  const result = await pickerService.markItemUnavailable(
    req.user.id,
    Number(req.params.orderId),
    Number(req.params.itemId),
    req.body.note
  );
  res.json(result);
};

export const substituteItem = async (req, res) => {
  const { substituteProductId, note } = req.body;
  const result = await pickerService.substituteItem(
    req.user.id,
    Number(req.params.orderId),
    Number(req.params.itemId),
    substituteProductId,
    note
  );
  res.json(result);
};

export const updatePickerNotes = async (req, res) => {
  const result = await pickerService.updatePickerNotes(
    req.user.id,
    Number(req.params.orderId),
    req.body.notes
  );
  res.json(result);
};
