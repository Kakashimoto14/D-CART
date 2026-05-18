import request from "supertest";
import app from "../src/app.js";

describe("GET /api/health", () => {
  it("returns service health", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "dcart-backend",
      queues: expect.objectContaining({
        enabled: expect.any(Boolean),
        registered: expect.any(Number)
      })
    });
  });
});
