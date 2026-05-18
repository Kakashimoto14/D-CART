import { jest } from "@jest/globals";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test_db?schema=public";
process.env.JWT_SECRET ||= "test-secret";
process.env.GOOGLE_CLIENT_ID ||= "google-client-id.apps.googleusercontent.com";

const findUniqueMock = jest.fn();
const createMock = jest.fn();
const updateMock = jest.fn();
const buildAuthenticatedResponseMock = jest.fn();
const verifyIdTokenMock = jest.fn();
const getPayloadMock = jest.fn();
const recordMock = jest.fn();

jest.unstable_mockModule("../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
      create: createMock,
      update: updateMock
    }
  }
}));

jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdTokenMock;
  }
}));

jest.unstable_mockModule("../src/services/auth.service.js", () => ({
  AuthService: class {
    buildAuthenticatedResponse = buildAuthenticatedResponseMock;
  }
}));

jest.unstable_mockModule("../src/services/audit.service.js", () => ({
  AuditService: class {
    record = recordMock;
  }
}));

const { GoogleAuthService } = await import("../src/services/googleAuth.service.js");

describe("GoogleAuthService.authenticate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue({
      getPayload: getPayloadMock
    });
  });

  it("creates a new customer account for a verified Google user", async () => {
    getPayloadMock.mockReturnValue({
      sub: "google-sub-1",
      email: "fresh@example.com",
      email_verified: true,
      name: "Fresh Customer",
      picture: "https://example.com/avatar.png"
    });
    findUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    createMock.mockResolvedValue({
      id: 10,
      name: "Fresh Customer",
      email: "fresh@example.com",
      role: "CUSTOMER",
      authProvider: "GOOGLE",
      avatarUrl: "https://example.com/avatar.png"
    });
    buildAuthenticatedResponseMock.mockResolvedValue({
      token: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: 10,
        role: "CUSTOMER"
      }
    });

    const service = new GoogleAuthService();
    const result = await service.authenticate({ credential: "google-credential" });

    expect(verifyIdTokenMock).toHaveBeenCalledWith({
      idToken: "google-credential",
      audience: ["google-client-id.apps.googleusercontent.com"]
    });
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "fresh@example.com",
        password: null,
        role: "CUSTOMER",
        authProvider: "GOOGLE",
        googleSub: "google-sub-1",
        cart: {
          create: {}
        }
      })
    });
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.google_register",
        actorUserId: 10
      })
    );
    expect(result.user.role).toBe("CUSTOMER");
  });

  it("rejects Google sign-in for existing privileged accounts", async () => {
    getPayloadMock.mockReturnValue({
      sub: "google-sub-2",
      email: "admin@example.com",
      email_verified: true,
      name: "Admin Person"
    });
    findUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 3,
      email: "admin@example.com",
      role: "ADMIN",
      googleSub: null
    });

    const service = new GoogleAuthService();

    await expect(service.authenticate({ credential: "google-credential" })).rejects.toMatchObject({
      statusCode: 403
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
