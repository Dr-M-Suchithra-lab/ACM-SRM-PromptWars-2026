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
  const data: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string" &&
      data.error
        ? data.error
        : "Unable to complete the request";
    throw new Error(message);
  }
  return data as T;
}
