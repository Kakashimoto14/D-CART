import client from "./client";

export const dispatchApi = {
  myActiveDispatch: async () => {
    const { data } = await client.get("/dispatch/rider/me");
    return data.assignment;
  },
  board: async () => {
    const { data } = await client.get("/dispatch/board");
    return data.board;
  },
  createRider: async (payload) => {
    const { data } = await client.post("/dispatch/riders", payload);
    return data.rider;
  },
  updateAvailability: async (riderId, isAvailable) => {
    const { data } = await client.patch(`/dispatch/riders/${riderId}/availability`, { isAvailable });
    return data.rider;
  },
  assignRider: async (orderId, riderId) => {
    const { data } = await client.patch(`/dispatch/orders/${orderId}/assign`, { riderId });
    return data.assignment;
  },
  startDispatch: async (orderId) => {
    const { data } = await client.patch(`/dispatch/orders/${orderId}/start`);
    return data.order;
  },
  completeDispatch: async (orderId, payload) => {
    const { data } = await client.patch(`/dispatch/orders/${orderId}/complete`, payload);
    return data.order;
  },
  failDispatch: async (orderId, payload) => {
    const { data } = await client.patch(`/dispatch/orders/${orderId}/fail`, payload);
    return data.order;
  },
  updateMyLocation: async (payload) => {
    const { data } = await client.patch("/dispatch/rider/me/location", payload);
    return data.rider;
  }
};
