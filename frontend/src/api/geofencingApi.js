import client from "./client";

export const geofencingApi = {
  validateLocation: ({
    latitude,
    longitude,
    accuracyMeters,
    deliveryType,
    deliverySlotId,
    orderSubtotal
  }) =>
    client
      .post("/geofencing/validate", {
        latitude,
        longitude,
        accuracyMeters,
        deliveryType,
        deliverySlotId,
        orderSubtotal
      })
      .then((res) => res.data),

  getStoreZone: () =>
    client.get("/geofencing/store-zone").then((res) => res.data)
};
