import "express";

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: string;
      institutionId: string;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
