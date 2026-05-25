const defaultPort = 8080;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? `${defaultPort}`, 10),
  corsOrigin: process.env.CORS_ORIGIN ?? "*"
};
