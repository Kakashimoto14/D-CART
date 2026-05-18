import { FulfillmentService } from "../services/fulfillment.service.js";

const fulfillmentService = new FulfillmentService();

export const markOrderPacked = async (req, res) => {
  const order = await fulfillmentService.markOrderPacked(
    req.user.id,
    Number(req.params.orderId),
    req.body
  );
  res.status(200).json({ order });
};

export const markOrderReadyForDispatch = async (req, res) => {
  const order = await fulfillmentService.markOrderReadyForDispatch(
    req.user.id,
    Number(req.params.orderId)
  );
  res.status(200).json({ order });
};
