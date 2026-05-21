import { prisma } from "../config/prisma.js";
import { ROLES } from "../constants/roles.js";
import { emitOrderChanged } from "../realtime/socket.js";
import { AppError } from "../utils/AppError.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { hashPassword } from "../utils/password.js";
import { AuditService } from "./audit.service.js";
import { NotificationService } from "./notification.service.js";

const AVERAGE_RIDER_SPEED_KMH = 18;
const notificationService = new NotificationService();
const auditService = new AuditService();

export class DispatchService {
  calculateDistanceKm(originLat, originLon, destinationLat, destinationLon) {
    const toRadians = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const latDelta = toRadians(destinationLat - originLat);
    const lonDelta = toRadians(destinationLon - originLon);
    const a =
      Math.sin(latDelta / 2) ** 2 +
      Math.cos(toRadians(originLat)) *
        Math.cos(toRadians(destinationLat)) *
        Math.sin(lonDelta / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  calculateEta(distanceKm) {
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      return null;
    }

    const rawMinutes = (distanceKm / AVERAGE_RIDER_SPEED_KMH) * 60;
    const etaMinutes = Math.max(5, Math.round(rawMinutes));

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      etaMinutes,
      estimatedAt: new Date(Date.now() + etaMinutes * 60 * 1000)
    };
  }

  async createRider(payload) {
    const email = normalizeEmail(payload.email);
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError("Email is already registered.", 409);
    }

    const hashedPassword = await hashPassword(payload.password);

    const rider = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.name,
          email,
          phone: payload.phone,
          password: hashedPassword,
          role: ROLES.STAFF
        }
      });

      return tx.rider.create({
        data: {
          userId: user.id,
          vehicleType: payload.vehicleType
        },
        include: {
          user: true
        }
      });
    });

    return this.mapRider(rider);
  }

  mapRider(rider) {
    return {
      id: rider.id,
      userId: rider.userId,
      name: rider.user?.name || null,
      email: rider.user?.email || null,
      phone: rider.user?.phone || null,
      vehicleType: rider.vehicleType,
      isActive: rider.isActive,
      isAvailable: rider.isAvailable,
      currentLatitude: rider.currentLatitude ? Number(rider.currentLatitude) : null,
      currentLongitude: rider.currentLongitude ? Number(rider.currentLongitude) : null,
      lastSeenAt: rider.lastSeenAt,
      createdAt: rider.createdAt
    };
  }

  mapActiveAssignment(assignment) {
    if (!assignment) {
      return null;
    }

    const distanceKm =
      assignment.delivery?.order?.delivery?.distanceKm ??
      assignment.delivery?.distanceKm ??
      assignment.deliveryDistanceKm ??
      null;

    return {
      id: assignment.id,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      pickedUpAt: assignment.pickedUpAt,
      recipientName: assignment.recipientName,
      proofNote: assignment.proofNote,
      completedAt: assignment.completedAt,
      eta: assignment.delivery?.estimatedAt
        ? {
            estimatedAt: assignment.delivery.estimatedAt,
            distanceKm: distanceKm ? Number(distanceKm) : null
          }
        : null,
      rider: assignment.rider ? this.mapRider(assignment.rider) : null,
      order: assignment.delivery?.order
        ? {
            id: assignment.delivery.order.id,
            status: assignment.delivery.order.status,
            total: Number(assignment.delivery.order.total),
            customer: assignment.delivery.order.user
              ? {
                  id: assignment.delivery.order.user.id,
                  name: assignment.delivery.order.user.name,
                  email: assignment.delivery.order.user.email
                }
              : null
          }
        : null,
      delivery: assignment.delivery
        ? {
            id: assignment.delivery.id,
            address: assignment.delivery.address,
            latitude: assignment.delivery.latitude ? Number(assignment.delivery.latitude) : null,
            longitude: assignment.delivery.longitude ? Number(assignment.delivery.longitude) : null,
            status: assignment.delivery.status,
            estimatedAt: assignment.delivery.estimatedAt
          }
        : null
    };
  }

  async listDispatchBoard() {
    const [riders, readyOrders, activeAssignments] = await Promise.all([
      prisma.rider.findMany({
        include: { user: true },
        orderBy: [{ isAvailable: "desc" }, { updatedAt: "desc" }]
      }),
      prisma.order.findMany({
        where: {
          status: "READY_FOR_DELIVERY"
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          delivery: {
            include: {
              assignments: {
                where: {
                  status: "ASSIGNED"
                },
                include: {
                  rider: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          },
          deliverySlot: true
        },
        orderBy: [{ readyForDispatchAt: "asc" }, { createdAt: "asc" }]
      }),
      prisma.deliveryAssignment.findMany({
        where: {
          status: {
            in: ["ASSIGNED", "PICKED_UP"]
          }
        },
        include: {
          delivery: {
            include: {
              order: true
            }
          },
          rider: {
            include: {
              user: true
            }
          }
        },
        orderBy: { assignedAt: "desc" }
      })
    ]);

    return {
      riders: riders.map((rider) => this.mapRider(rider)),
      readyOrders: readyOrders.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        stagingLabel: order.stagingLabel,
        stagingZone: order.stagingZone,
        readyForDispatchAt: order.readyForDispatchAt,
        customer: order.user,
        delivery: order.delivery
          ? {
              id: order.delivery.id,
              address: order.delivery.address,
              distanceKm: order.delivery.distanceKm ? Number(order.delivery.distanceKm) : null,
              status: order.delivery.status,
              assignments: order.delivery.assignments.map((assignment) => ({
                id: assignment.id,
                status: assignment.status,
                rider: this.mapRider(assignment.rider)
              }))
            }
          : null,
        deliverySlot: order.deliverySlot
      })),
      activeAssignments: activeAssignments.map((assignment) => this.mapActiveAssignment(assignment))
    };
  }

  async getMyActiveDispatch(userId) {
    const rider = await prisma.rider.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!rider) {
      return null;
    }

    const assignment = await prisma.deliveryAssignment.findFirst({
      where: {
        riderId: rider.id,
        status: {
          in: ["ASSIGNED", "PICKED_UP"]
        }
      },
      include: {
        rider: {
          include: {
            user: true
          }
        },
        delivery: {
          include: {
            order: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { assignedAt: "desc" }
    });

    return this.mapActiveAssignment(assignment);
  }

  async updateRiderAvailability(riderId, isAvailable) {
    const rider = await prisma.rider.update({
      where: { id: riderId },
      data: { isAvailable },
      include: { user: true }
    });

    return this.mapRider(rider);
  }

  async updateMyRiderLocation(userId, payload) {
    const rider = await prisma.rider.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!rider) {
      throw new AppError("Rider profile not found for this account.", 404);
    }

    const activeAssignment = await prisma.deliveryAssignment.findFirst({
      where: {
        riderId: rider.id,
        status: {
          in: ["ASSIGNED", "PICKED_UP"]
        }
      },
      include: {
        rider: {
          include: {
            user: true
          }
        },
        delivery: {
          include: {
            order: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { assignedAt: "desc" }
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRider = await tx.rider.update({
        where: { id: rider.id },
        data: {
          currentLatitude: payload.latitude,
          currentLongitude: payload.longitude,
          lastSeenAt: new Date()
        },
        include: {
          user: true
        }
      });

      if (!activeAssignment?.delivery) {
        return { rider: updatedRider, assignment: null };
      }

      const destinationLat = activeAssignment.delivery.latitude
        ? Number(activeAssignment.delivery.latitude)
        : null;
      const destinationLon = activeAssignment.delivery.longitude
        ? Number(activeAssignment.delivery.longitude)
        : null;

      if (destinationLat === null || destinationLon === null) {
        return { rider: updatedRider, assignment: { ...activeAssignment, rider: updatedRider } };
      }

      const distanceKm = this.calculateDistanceKm(
        payload.latitude,
        payload.longitude,
        destinationLat,
        destinationLon
      );
      const eta = this.calculateEta(distanceKm);

      const updatedDelivery = await tx.delivery.update({
        where: { id: activeAssignment.delivery.id },
        data: {
          estimatedAt: eta?.estimatedAt || activeAssignment.delivery.estimatedAt
        }
      });

      return {
        rider: updatedRider,
        assignment: {
          ...activeAssignment,
          rider: updatedRider,
          delivery: {
            ...activeAssignment.delivery,
            estimatedAt: updatedDelivery.estimatedAt,
            distanceKm: eta?.distanceKm ?? activeAssignment.delivery.distanceKm
          }
        }
      };
    });

    if (activeAssignment?.delivery?.order) {
      emitOrderChanged({
        orderId: activeAssignment.delivery.order.id,
        userId: activeAssignment.delivery.order.userId,
        status: activeAssignment.delivery.order.status,
        type: "rider_location_updated"
      });
    }

    return {
      rider: this.mapRider(updated.rider),
      assignment: this.mapActiveAssignment(updated.assignment)
    };
  }

  async assignRider(orderId, riderId, actorUserId = null) {
    const [order, rider] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          delivery: {
            include: {
              assignments: {
                where: {
                  status: {
                    in: ["ASSIGNED", "PICKED_UP"]
                  }
                }
              }
            }
          }
        }
      }),
      prisma.rider.findUnique({
        where: { id: riderId },
        include: { user: true }
      })
    ]);

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.status !== "READY_FOR_DELIVERY") {
      throw new AppError("Only ready-for-delivery orders can be assigned to a rider.", 400);
    }

    if (!order.delivery) {
      throw new AppError("Delivery record not found for this order.", 404);
    }

    if (!rider || !rider.isActive) {
      throw new AppError("Rider not found or inactive.", 404);
    }

    if (!rider.isAvailable) {
      throw new AppError("Selected rider is currently unavailable.", 400);
    }

    if (order.delivery.assignments.length > 0) {
      throw new AppError("This order already has an active rider assignment.", 409);
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.deliveryAssignment.create({
        data: {
          deliveryId: order.delivery.id,
          riderId
        },
        include: {
          rider: {
            include: {
              user: true
            }
          },
          delivery: {
            include: {
              order: true
            }
          }
        }
      });

      await tx.rider.update({
        where: { id: riderId },
        data: { isAvailable: false }
      });

      return created;
    });

    emitOrderChanged({
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      type: "rider_assigned"
    });
    await auditService.record({
      action: "dispatch.rider.assigned",
      entityType: "order",
      entityId: order.id,
      actorUserId,
      before: { status: order.status },
      after: { status: order.status },
      metadata: {
        riderId,
        riderName: assignment.rider?.user?.name || null
      }
    });

    return {
      id: assignment.id,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      rider: this.mapRider(assignment.rider)
    };
  }

  async startDispatch(orderId, actorUserId = null) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        delivery: {
          include: {
            assignments: {
              where: {
                status: "ASSIGNED"
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.status !== "READY_FOR_DELIVERY") {
      throw new AppError("Order is not ready for dispatch.", 400);
    }

    const assignment = order.delivery?.assignments?.[0];
    if (!assignment) {
      throw new AppError("Assign a rider before starting dispatch.", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "PICKED_UP",
          pickedUpAt: new Date()
        }
      });

      await tx.delivery.update({
        where: { id: order.delivery.id },
        data: { status: "OUT_FOR_DELIVERY" }
      });

      return tx.order.update({
        where: { id: orderId },
        data: { status: "OUT_FOR_DELIVERY" }
      });
    });

    emitOrderChanged({
      orderId: updated.id,
      userId: updated.userId,
      status: updated.status,
      type: "dispatch_started"
    });
    await auditService.record({
      action: "dispatch.started",
      entityType: "order",
      entityId: updated.id,
      actorUserId,
      before: { status: order.status },
      after: { status: updated.status },
      metadata: {
        oldStatus: order.status,
        newStatus: updated.status
      }
    });
    await notificationService.enqueueOrderStatus(updated.id, updated.status);

    return {
      id: updated.id,
      status: updated.status
    };
  }

  async completeDispatch(orderId, payload, actorUserId = null) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        delivery: {
          include: {
            assignments: {
              where: {
                status: "PICKED_UP"
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.status !== "OUT_FOR_DELIVERY") {
      throw new AppError("Only out-for-delivery orders can be completed.", 400);
    }

    const assignment = order.delivery?.assignments?.[0];
    if (!assignment) {
      throw new AppError("No active picked-up assignment found for this order.", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "DELIVERED",
          recipientName: payload.recipientName,
          proofNote: payload.proofNote || null,
          completedAt: new Date()
        }
      });

      await tx.delivery.update({
        where: { id: order.delivery.id },
        data: { status: "DELIVERED" }
      });

      await tx.rider.update({
        where: { id: assignment.riderId },
        data: { isAvailable: true }
      });

      return tx.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED" }
      });
    });

    emitOrderChanged({
      orderId: updated.id,
      userId: updated.userId,
      status: updated.status,
      type: "delivered"
    });
    await auditService.record({
      action: "dispatch.completed",
      entityType: "order",
      entityId: updated.id,
      actorUserId,
      before: { status: order.status },
      after: { status: updated.status },
      metadata: {
        oldStatus: order.status,
        newStatus: updated.status,
        recipientName: payload.recipientName
      }
    });
    await notificationService.enqueueOrderStatus(updated.id, updated.status);

    return {
      id: updated.id,
      status: updated.status
    };
  }

  async failDispatch(orderId, payload, actorUserId = null) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        delivery: {
          include: {
            assignments: {
              where: {
                status: "PICKED_UP"
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.status !== "OUT_FOR_DELIVERY") {
      throw new AppError("Only out-for-delivery orders can be marked as failed.", 400);
    }

    const assignment = order.delivery?.assignments?.[0];
    if (!assignment) {
      throw new AppError("No active picked-up assignment found for this order.", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "FAILED",
          proofNote: payload.proofNote,
          completedAt: new Date()
        }
      });

      await tx.delivery.update({
        where: { id: order.delivery.id },
        data: { status: "CANCELLED" }
      });

      await tx.rider.update({
        where: { id: assignment.riderId },
        data: { isAvailable: true }
      });

      return tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" }
      });
    });

    emitOrderChanged({
      orderId: updated.id,
      userId: updated.userId,
      status: updated.status,
      type: "delivery_failed"
    });
    await auditService.record({
      action: "dispatch.failed",
      entityType: "order",
      entityId: updated.id,
      actorUserId,
      before: { status: order.status },
      after: { status: updated.status },
      metadata: {
        oldStatus: order.status,
        newStatus: updated.status,
        note: payload.proofNote
      }
    });
    await notificationService.enqueueOrderStatus(updated.id, updated.status);

    return {
      id: updated.id,
      status: updated.status
    };
  }
}
