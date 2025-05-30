import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  MONGODB_URI: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    MONGODB_URI: joi.string().required(),
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
};
