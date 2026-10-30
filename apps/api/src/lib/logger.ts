import pino, { type Logger, type LoggerOptions } from 'pino';
import { env, isDev } from '../config/env.js';

const serializers = {
  err: pino.stdSerializers.err,
  req: pino.stdSerializers.req,
  res: pino.stdSerializers.res,
};

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'passwordHash',
  'refreshHash',
  'tokenHash',
  'otpHash',
  'phone',
  'email',
  'pan',
  'licenseNumber',
  'idNumber',
];

const baseOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  serializers,
  redact: { paths: redactPaths, censor: '[REDACTED]' },
};

export const logger: Logger = isDev
  ? pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      },
    })
  : pino(baseOptions);