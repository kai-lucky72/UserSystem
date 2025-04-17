import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse JSON error response
      const errorData = await res.json();
      throw new Error(errorData.message || `${res.status}: ${res.statusText}`);
    } catch (jsonError) {
      // Fall back to text if not JSON
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Replace any undefined values with empty strings
  let processedData = data;
  if (data && typeof data === 'object') {
    processedData = JSON.parse(
      JSON.stringify(data, (key, value) => (value === undefined ? "" : value))
    );
  }

  const res = await fetch(url, {
    method,
    headers: processedData ? { "Content-Type": "application/json" } : {},
    body: processedData ? JSON.stringify(processedData) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
