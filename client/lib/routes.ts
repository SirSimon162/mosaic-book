export const routes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  terms: "/terms",
  privacy: "/privacy",
} as const;

export type RouteKey = keyof typeof routes;
