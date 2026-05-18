import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OrdersPage } from "./OrdersPage";

const listMock = vi.fn();
const reviewSubstitutionMock = vi.fn();

vi.mock("../api/orderApi", () => ({
  orderApi: {
    list: (...args) => listMock(...args),
    reviewSubstitution: (...args) => reviewSubstitutionMock(...args),
    cancel: vi.fn(),
    downloadReceipt: vi.fn(),
    updateStatus: vi.fn()
  }
}));

vi.mock("../hooks/useOrderRealtime", () => ({
  useOrderRealtime: () => ({ isConnected: false })
}));

const buildOrder = (overrides = {}) => ({
  id: 101,
  createdAt: "2026-05-17T08:00:00.000Z",
  status: "PACKING",
  paymentMethod: "GCASH",
  paymentStatus: "PAID",
  total: 210,
  subtotal: 180,
  deliveryFee: 30,
  refundStatus: "PENDING",
  refundAmount: 40,
  delivery: {
    address: "123 Sample Street",
    status: "SCHEDULED",
    assignments: []
  },
  deliverySlot: {
    startTime: "10:00",
    endTime: "12:00"
  },
  items: [
    {
      id: 11,
      quantity: 2,
      finalQuantity: 0,
      price: 90,
      product: { name: "Fresh Milk" },
      substituteProductId: 99,
      substituteProduct: { name: "Organic Milk" },
      substitutionNote: "Closest available brand",
      substitutionDecision: "PENDING",
      pickStatus: "SUBSTITUTED"
    }
  ],
  ...overrides
});

describe("OrdersPage", () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

  beforeEach(() => {
    listMock.mockReset();
    reviewSubstitutionMock.mockReset();
  });

  it("renders pending substitute actions and refund notice", async () => {
    listMock.mockResolvedValue({
      orders: [buildOrder()],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    });

    renderPage();

    expect(await screen.findByText("Approve substitute")).toBeInTheDocument();
    expect(screen.getByText(/Partial fulfillment adjustment pending/i)).toBeInTheDocument();
    expect(screen.getByText(/Substituted with: Organic Milk/i)).toBeInTheDocument();
  }, 15000);

  it("submits substitution approval and reloads orders", async () => {
    listMock
      .mockResolvedValueOnce({
        orders: [buildOrder()],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      })
      .mockResolvedValueOnce({
        orders: [
          buildOrder({
            refundStatus: "COMPLETED",
            substitutionDecision: "APPROVED",
            refundAmount: 40
          })
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });
    reviewSubstitutionMock.mockResolvedValue({});

    renderPage();

    fireEvent.click(await screen.findByText("Approve substitute"));

    await waitFor(() => {
      expect(reviewSubstitutionMock).toHaveBeenCalledWith(101, 11, "APPROVED");
    });

    await waitFor(() => {
      expect(screen.getByText(/Partial fulfillment refund completed/i)).toBeInTheDocument();
    });
  }, 15000);
});
