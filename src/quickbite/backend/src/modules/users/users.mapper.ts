import type { User, VendorMembership, FoodStall } from '@prisma/client';

type UserWithMemberships = User & {
  memberships?: (VendorMembership & { stall: Pick<FoodStall, 'id' | 'name' | 'slug'> })[];
};

/**
 * Dữ liệu người dùng an toàn để trả về client.
 * KHÔNG BAO GIỜ trả passwordHash hoặc tokenVersion.
 */
export function toPublicUser(user: UserWithMemberships) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    studentCode: user.studentCode,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    // Danh sách quầy mà người dùng VENDOR được quản lý
    stalls:
      user.memberships?.map((m) => ({ id: m.stall.id, name: m.stall.name, slug: m.stall.slug, role: m.role })) ?? [],
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;

/** Prisma include dùng chung để lấy kèm quầy được quản lý */
export const userWithStallsInclude = {
  memberships: { include: { stall: { select: { id: true, name: true, slug: true } } } },
} as const;
