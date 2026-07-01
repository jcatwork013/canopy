import { ApiError } from '@canopy/shared';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Never retry auth / not-ready / validation errors.
        if (error instanceof ApiError && [400, 401, 403, 422, 503].includes(error.status)) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
