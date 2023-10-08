import Core from "../Core.js";
import { core } from "../../index.js";

export async function rerenderFrontend(page: string) {
  const res = await fetch(
    process.env.FRONTEND_URL +
      `/api/revalidate?secret=${process.env.FRONTEND_KEY}&path=${page}`
  );
  if (res.status !== 200)
    core.getLogger().warn("Website Frontend is down, cannot rerender page.");
  // const data = await res.json();
}

export async function rerenderFrontendMultiple(pages: string[]) {
  const res = await fetch(
    process.env.FRONTEND_URL +
      `/api/revalidate?secret=${
        process.env.FRONTEND_KEY
      }&paths=${JSON.stringify(pages)}`
  );
  if (res.status !== 200)
    core.getLogger().warn("Website Frontend is down, cannot rerender pages.");
}
