import client from "./client";

export const fulfillmentApi = {
  markPacked: async (orderId, payload) => {
    const { data } = await client.patch(`/fulfillment/orders/${orderId}/packed`, payload);
    return data.order;
  },
  markReady: async (orderId) => {
    const { data } = await client.patch(`/fulfillment/orders/${orderId}/ready`);
    return data.order;
  }
};
