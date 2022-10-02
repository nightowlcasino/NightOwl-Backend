import winston from 'winston'

import os from 'os'
const hostname = os.hostname()

const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
}

const level = () => {
  const env = process.env.NODE_ENV || 'development'
  const isDevelopment = env === 'development'
  return isDevelopment ? 'debug' : 'warn'
}

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss:ms' }),
  winston.format.json(),
)

const transports = [
  new winston.transports.Console(),
]

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  defaultMeta: { hostname: `${hostname}`, app: "nightowl-backend" },
  transports,
})

export default logger