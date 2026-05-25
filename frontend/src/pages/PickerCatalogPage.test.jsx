import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PickerCatalogPage } from "./PickerCatalogPage";

const productListMock = vi.fn();
const categoryListMock = vi.fn();

vi.mock("../api/productApi", () => ({
  productApi: {
    list: (...args) => productListMock(...args)
  }
}));

vi.mock("../api/categoryApi", () => ({
  categoryApi: {
    list: (...args) => categoryListMock(...args)
  }
}));

describe("PickerCatalogPage", () => {
  beforeEach(() => {
    productListMock.mockReset();
    categoryListMock.mockReset();
  });

  it("renders a read-only catalog without requiring CustomerProvider", async () => {
    productListMock.mockResolvedValue({
      products: [
        {
          id: 7,
          name: "Brown Rice",
          price: 65,
          stock: 12,
          unit: "kilo",
          category: { id: 2, name: "Rice & Grains" },
          image: null,
          description: "Daily staple"
        }
      ]
    });
    categoryListMock.mockResolvedValue([
      { id: 2, name: "Rice & Grains", image: null }
    ]);

    render(
      <MemoryRouter>
        <PickerCatalogPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Brown Rice")).toBeInTheDocument();
    expect(screen.getByText("Read-only catalog for fulfillment accounts")).toBeInTheDocument();
    expect(screen.getByText("View only")).toBeInTheDocument();
    expect(screen.queryByText("Add")).not.toBeInTheDocument();
  });
});
