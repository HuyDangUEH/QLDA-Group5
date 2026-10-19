import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { render } from '@testing-library/react';
import type { User } from '@/features/auth/types';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    fullName: 'Nguyễn Văn An',
    email: 'an@test.local',
    phone: null,
    studentCode: null,
    role: 'STUDENT',
    status: 'ACTIVE',
    createdAt: '2026-10-01T00:00:00.000Z',
    stalls: [],
    ...overrides,
  };
}

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

/** Render các route trong router bộ nhớ, với QueryClient riêng cho mỗi test */
export function renderRoutes(routes: RouteObject[], initialPath: string, queryClient = createTestQueryClient()) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient };
}

export function withQueryClient(ui: ReactNode, queryClient = createTestQueryClient()) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
