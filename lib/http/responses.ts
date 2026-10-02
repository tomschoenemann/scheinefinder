export const PUBLIC_SHORT_CACHE = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

export const PUBLIC_DAY_CACHE = {
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
};

export function jsonError(error: string, status: number) {
  return Response.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
