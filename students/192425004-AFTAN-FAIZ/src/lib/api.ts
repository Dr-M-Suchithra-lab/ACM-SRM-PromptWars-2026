export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The server validates business inputs and owns the response contracts.
 * Keep the JSON type boundary here rather than spreading implicit `any` through UI code.
 */
export async function requestApi<T = unknown>(
  path: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    // Hosting proxies can return HTML. Never display their raw diagnostic body.
    throw new ApiError(
      response.ok
        ? "Invalid response from the service. Please retry."
        : "Unable to complete the request",
      response.status,
    );
  }
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string" &&
      data.error
        ? data.error
        : "Unable to complete the request";
    throw new ApiError(message, response.status);
  }
  return data as T;
}
