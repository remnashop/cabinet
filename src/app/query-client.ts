import { QueryClient } from "@tanstack/react-query";

import { ApiError, setSessionEndHandler } from "@shared/api/http";

// provided in main.tsx, around the shader too: the appearance it reads is fetched before boot
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // a 4xx won't change on retry; 5xx and network errors might
      retry: (failureCount, error) => failureCount < 2 && !(error instanceof ApiError && error.status < 500),
      refetchOnWindowFocus: false,
    },
  },
});

// no navigate here: RequireAuth sees the cleared token and goes to /login?next=<where the user was>
// appearance is public and the same for every account: kept, so the theme doesn't flash back
setSessionEndHandler(() => {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "appearance" });
});
