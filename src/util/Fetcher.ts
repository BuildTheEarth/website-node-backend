export default async function runFetch(path: string, body: any, opts?: any) {
  return await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    ...opts,
  })
    .then((res) => res.json())
    .catch((e) =>
      console.error(`runFetch Error: ${path} with ${body} ${opts}`)
    );
}
