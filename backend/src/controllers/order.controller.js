import { OrderService } from "../services/order.service.js";

const orderService = new OrderService();

export const checkout = async (req, res) => {
  const order = await orderService.checkout(req.user.id, req.body);
  res.status(201).json({ order });
};

export const listOrders = async (req, res) => {
  const result = await orderService.listOrders(req.user, req.query);
  res.status(200).json(result);
};

export const getOrder = async (req, res) => {
  const order = await orderService.getOrder(req.user, Number(req.params.id));
  res.status(200).json({ order });
};

export const updateOrderStatus = async (req, res) => {
  const order = await orderService.updateStatus(Number(req.params.id), req.body.status, req.user.id, {
    note: req.body.note
  });
  res.status(200).json({ order });
};

export const cancelOrder = async (req, res) => {
  const order = await orderService.cancelOrder(req.user.id, Number(req.params.id));
  res.status(200).json({ order });
};

export const reviewSubstitution = async (req, res) => {
  const order = await orderService.reviewSubstitution(
    req.user.id,
    Number(req.params.id),
    Number(req.params.itemId),
    req.body.decision
  );
  res.status(200).json({ order });
};

export const downloadReceipt = async (req, res) => {
  const { stream, filename } = await orderService.generateReceipt(req.user, Number(req.params.id));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  stream.pipe(res);
  stream.end();
};

export const handlePaymongoWebhook = async (req, res) => {
  const payload = await orderService.handlePaymongoWebhook(
    req.body,
    req.headers["paymongo-signature"]
  );

  res.status(200).json(payload);
};
