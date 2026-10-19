export type Role = 'STUDENT' | 'VENDOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface ManagedStall {
  id: number;
  name: string;
  slug: string;
  role: 'OWNER' | 'STAFF';
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  studentCode: string | null;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  stalls: ManagedStall[];
}

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Sinh viên',
  VENDOR: 'Chủ quầy',
  ADMIN: 'Quản trị viên',
};

export const STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  SUSPENDED: 'Bị khoá',
};

/** Trang mặc định sau khi đăng nhập theo vai trò */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/',
  VENDOR: '/quan-ly',
  ADMIN: '/quan-tri',
};
