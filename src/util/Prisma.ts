export async function middlewareUploadSrc(params, next) {
  const result = await next(params);
  if (params.model == "Upload") {
    result.src = `https://cdn.buildtheearth.net/uploads/${result.name}`;
  }
  return result;
}
