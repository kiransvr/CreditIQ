import type { NextFunction, Request, Response } from "express";

function unauthorized(res: Response, message: string) {
  return res.status(401).json({
    code: "UNAUTHORIZED",
    message,
    details: []
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized(res, "Bearer token is required");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (token.length === 0) {
    return unauthorized(res, "Bearer token is required");
  }

  const userId = req.header("x-user-id") ?? "demo-user";
  const role = req.header("x-user-role") ?? "loan_officer";
  const institutionId = req.header("x-institution-id") ?? "demo-bank";

  req.user = {
    id: userId,
    role,
    institutionId
  };

  return next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "You do not have access to this action",
        details: []
      });
    }

    return next();
  };
}
