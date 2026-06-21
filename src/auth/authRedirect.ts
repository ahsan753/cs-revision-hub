export function buildAuthRedirectTo(origin: string, basePath: string) {
  return new URL(basePath || "/", origin).toString();
}

export function getAuthRedirectTo() {
  return buildAuthRedirectTo(window.location.origin, import.meta.env.BASE_URL);
}
