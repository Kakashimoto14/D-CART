import client from "./client";

export const deliverySlotApi = {
  getAvailable: (from, to, deliveryType) =>
    client
      .get("/delivery-slots", { params: { from, to, deliveryType } })
      .then((res) => res.data),

  adminGetAll: () =>
    client
      .get("/delivery-slots/all")
      .then((res) => res.data),

  generate: (date, slots) =>
    client
      .post("/delivery-slots/generate", { date, slots })
      .then((res) => res.data)
};
