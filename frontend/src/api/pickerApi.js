import client from "./client";

export const pickerApi = {
  getOrders: () => client.get("/picker/orders").then((res) => res.data),

  claimOrder: (orderId) =>
    client.patch(`/picker/orders/${orderId}/claim`).then((res) => res.data),

  pickItem: (orderId, itemId, payload) =>
    client
      .patch(`/picker/orders/${orderId}/items/${itemId}/pick`, payload)
      .then((res) => res.data),

  markUnavailable: (orderId, itemId, payload) =>
    client
      .patch(`/picker/orders/${orderId}/items/${itemId}/unavailable`, payload)
      .then((res) => res.data),

  substituteItem: (orderId, itemId, payload) =>
    client
      .patch(`/picker/orders/${orderId}/items/${itemId}/substitute`, payload)
      .then((res) => res.data),

  updateNotes: (orderId, notes) =>
    client
      .patch(`/picker/orders/${orderId}/notes`, { notes })
      .then((res) => res.data)
};
