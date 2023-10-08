export async function middlewareUploadSrc(params, next) {
  const result = await next(params);
  if (params.model == "Upload") {
    result.src = `https://cdn.buildtheearth.net/upload/${result.name}`;
  }
  return result;
}
