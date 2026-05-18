import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("renders the provided label", () => {
    render(<LoadingState label="Loading grocery dashboard..." />);

    expect(screen.getByText("Loading grocery dashboard...")).toBeInTheDocument();
  });
});
