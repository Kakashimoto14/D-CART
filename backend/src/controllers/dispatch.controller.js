import { DispatchService } from "../services/dispatch.service.js";

const dispatchService = new DispatchService();

export const getDispatchBoard = async (_req, res) => {
  const board = await dispatchService.listDispatchBoard();
  res.status(200).json({ board });
};

export const getMyActiveDispatch = async (req, res) => {
  const assignment = await dispatchService.getMyActiveDispatch(req.user.id);
  res.status(200).json({ assignment });
};

export const createRider = async (req, res) => {
  const rider = await dispatchService.createRider(req.body);
  res.status(201).json({ rider });
};

export const updateRiderAvailability = async (req, res) => {
  const rider = await dispatchService.updateRiderAvailability(
    Number(req.params.riderId),
    req.body.isAvailable
  );
  res.status(200).json({ rider });
};

export const updateMyRiderLocation = async (req, res) => {
  const rider = await dispatchService.updateMyRiderLocation(req.user.id, req.body);
  res.status(200).json({ rider });
};

export const assignRider = async (req, res) => {
  const assignment = await dispatchService.assignRider(
    Number(req.params.orderId),
    req.body.riderId
  );
  res.status(200).json({ assignment });
};

export const startDispatch = async (req, res) => {
  const order = await dispatchService.startDispatch(Number(req.params.orderId));
  res.status(200).json({ order });
};

export const completeDispatch = async (req, res) => {
  const order = await dispatchService.completeDispatch(Number(req.params.orderId), req.body);
  res.status(200).json({ order });
};

export const failDispatch = async (req, res) => {
  const order = await dispatchService.failDispatch(Number(req.params.orderId), req.body);
  res.status(200).json({ order });
};
