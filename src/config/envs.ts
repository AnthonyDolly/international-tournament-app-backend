import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  MONGODB_URI: string;
  BASE_URL: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    BASE_URL: joi
      .string()
      .uri({ scheme: ['http', 'https'] })
      .required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envsVars: EnvVars = value;

export const envs = {
  port: envsVars.PORT,
  mongodbUri: envsVars.MONGODB_URI,
  // remove trailing slash to avoid `//uploads`
  baseUrl: envsVars.BASE_URL.replace(/\/+$/, ''),
};
