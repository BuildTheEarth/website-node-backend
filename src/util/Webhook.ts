export function rerenderFrontend(page: string) {
  fetch(
    process.env.FRONTEND_URL +
      `/api/revalidate?secret=${process.env.FRONTEND_KEY}&path=${page}`
  ).then((res) => res.json());
}

export function rerenderFrontendMultiple(pages: string[]) {
  fetch(
    process.env.FRONTEND_URL +
      `/api/revalidate?secret=${process.env.FRONTEND_KEY}&path=${JSON.stringify(
        pages
      )}`
  ).then((res) => res.json());
}
