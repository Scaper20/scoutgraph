export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path);
  } catch {
    throw new ApiError('Could not reach the API server.', 0);
  }

  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message || 'The graph database is unreachable.', 503);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message || `Request failed (${res.status})`, res.status);
  }
  return res.json();
}
