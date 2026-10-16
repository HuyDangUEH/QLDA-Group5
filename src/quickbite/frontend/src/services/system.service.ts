import { apiClient, request } from '@/lib/api-client';
import type { ApiSuccess, HealthStatus } from '@/types/api';

export const systemService = {
  health: () => request(apiClient.get<ApiSuccess<HealthStatus>>('/health')),
};
