import { GeofencingService } from "../services/geofencing.service.js";

const geofencingService = new GeofencingService();

export const validateLocation = async (req, res) => {
  const {
    latitude,
    longitude,
    accuracyMeters,
    deliveryType,
    deliverySlotId,
    orderSubtotal
  } = req.body;
  const result = await geofencingService.quoteDelivery({
    latitude,
    longitude,
    accuracyMeters,
    deliveryType,
    deliverySlotId,
    orderSubtotal
  });
  res.json(result);
};

export const getStoreZone = async (_req, res) => {
  const zone = await geofencingService.getStoreZone();
  res.json(zone);
};
