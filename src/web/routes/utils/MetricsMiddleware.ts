import promBundle from "express-prom-bundle";

const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: {
    project_name: "website_backend",
  },
  promClient: { collectDefaultMetrics: {} },
});

export default metricsMiddleware;
