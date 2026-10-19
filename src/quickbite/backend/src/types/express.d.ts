import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    /** Người dùng đã xác thực, gắn vào request bởi middleware authenticate */
    interface AuthUser {
      id: number;
      email: string;
      fullName: string;
      role: Role;
    }

    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
