import winston from 'winston'
import os from 'os'
import LokiTransport from 'winston-loki'

const hostname = os.hostname()
const env = process.env.NODE_ENV || 'development'
const lokiEndpoint = env === 'local' ? 'http://127.0.0.1:3100' : 'http://logs.nightowlcasino.io:3100'

const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
}

const level = () => {
  const isDevelopment = env === 'development'
  return isDevelopment ? 'debug' : 'info'
}

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss:ms' }),
  winston.format.json(),
)

const transports = [
  new winston.transports.Console(),
]

const labels = {
  hostname: `${hostname}`,
  app: "nightowl-backend",
  env: env,
}

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  defaultMeta: labels,
  transports,
})

logger.add(new LokiTransport({
  host: lokiEndpoint,
  json: true,
  labels: labels,
  timeout: 30000,
  clearOnError: true,
  onConnectionError: (err) => console.error(err)
}))

export default logger