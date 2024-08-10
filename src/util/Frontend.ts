import { core } from "../../index.js";

export async function rerenderFrontend(query: string, props: any) {
  const routes = frontendRoutes
    .filter((r) => r.includes(query))
    .map((r) => {
      for (const key in props) {
        const value = props[key];
        r = r.replace(new RegExp(`\\[${key}\\]`, "g"), value);
      }
      return r;
    });
  const res = await fetch(
    process.env.FRONTEND_URL +
      `/api/revalidate?secret=${
        process.env.FRONTEND_KEY
      }&paths=${JSON.stringify(routes)}`,
  );
  if (res.status !== 200)
    core.getLogger().warn("Website Frontend is down, cannot rerender pages.");
  else core.getLogger().info(`Rerendered ${routes.length} pages.`);
}

export const frontendRoutes = [
  "/404",
  "/500",
  "/contact",
  "/calendar",
  "/",
  "/map",
  "/about",
  "/api/auth",
  "/faq",
  "/faq/manage",
  "/join/build",
  "/join",
  "/join/visit",
  "/legal/tos",
  "/me/claims",
  "/me",
  "/me/claims/[id]",
  "/me/settings/general",
  "/me/settings/accounts",
  "/me/settings/security",
  "/me/settings/session",
  "/newsletter/[newsletter]",
  "/newsletter",
  "/teams/[team]",
  "/teams",
  "/teams/[team]/apply",
  "/teams/[team]/manage/review",
  "/teams/[team]/manage/apply",
  "/teams/[team]/manage/images",
  "/teams/[team]/manage/review",
  "/teams/[team]/manage/members",
  "/teams/[team]/manage/settings",
  "/teams/[team]/manage/review/[id]",
];

export enum FrontendRoutesGroups {
  TEAM = "/teams",
  NEWSLETTER = "/newsletter",
  ME = "/me",
  FAQ = "/faq",
  ALL = "/",
}
