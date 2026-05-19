import { env } from "../config/env.js";
import { AuthService } from "../services/auth.service.js";
import { GoogleAuthService } from "../services/googleAuth.service.js";
import { buildRefreshTokenCookieOptions } from "../utils/authCookies.js";
import { verifyAccessToken } from "../utils/jwt.js";

const authService = new AuthService();
const googleAuthService = new GoogleAuthService();

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(env.refreshCookieName, refreshToken, buildRefreshTokenCookieOptions());
};

export const register = async (req, res) => {
  const result = await authService.register(req.body, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  });

  setRefreshCookie(res, result.refreshToken);

  res.status(201).json({
    token: result.token,
    user: result.user
  });
};

export const login = async (req, res) => {
  const result = await authService.login(req.body, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  });

  setRefreshCookie(res, result.refreshToken);

  res.status(200).json({
    token: result.token,
    user: result.user
  });
};

export const googleLogin = async (req, res) => {
  const result = await googleAuthService.authenticate(req.body, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  });

  setRefreshCookie(res, result.refreshToken);

  res.status(200).json({
    token: result.token,
    user: result.user
  });
};

export const refreshSession = async (req, res) => {
  const result = await authService.rotateSession(req.cookies?.[env.refreshCookieName], {
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  });

  setRefreshCookie(res, result.refreshToken);

  res.status(200).json({
    token: result.accessToken,
    user: result.user
  });
};

export const getSession = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(authHeader.split(" ")[1]);
      const user = await authService.getCurrentUser(Number(payload.sub));

      return res.status(200).json({
        authenticated: true,
        user
      });
    } catch (_error) {
      // Fall through to the refresh cookie path below.
    }
  }

  const refreshToken = req.cookies?.[env.refreshCookieName];
  if (!refreshToken) {
    return res.status(200).json({
      authenticated: false,
      user: null
    });
  }

  try {
    const result = await authService.rotateSession(refreshToken, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      authenticated: true,
      token: result.accessToken,
      user: result.user
    });
  } catch (_error) {
    res.clearCookie(env.refreshCookieName, buildRefreshTokenCookieOptions());
    return res.status(200).json({
      authenticated: false,
      user: null
    });
  }
};

export const logout = async (req, res) => {
  await authService.revokeSession(req.cookies?.[env.refreshCookieName], req.user?.id || null);
  res.clearCookie(env.refreshCookieName, buildRefreshTokenCookieOptions());
  res.status(200).json({ message: "Logged out successfully." });
};

export const getMe = async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json({ user });
};

export const forgotPassword = async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.status(200).json(result);
};

export const resetPassword = async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.status(200).json(result);
};
