import process from "node:process";
import { z } from "zod/v4";

// Production detection.
export const PRODUCTION = process.env.NODE_ENV === "production";

const envSchema = z.object({
	DISCORD_TOKEN: z.string().min(1),
	APMEKEN_AMETHYST_ROLE_ID: z.string().min(1),
	SCABARITE_CRYSTAL_ROLE_ID: z.string().min(1),
	MENAPHITE_GIFTS_ROLE_ID: z.string().min(1),
	WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID: z.string().min(1),
	GUTHIXIAN_CACHE_ROLE_ID: z.string().min(1),
	SNOWVERLOAD_ROLE_ID: z.string().min(1),
	NOTIFICATIONS_CHANNEL_ID: z.string().min(1),
	// Production-only.
	SENTRY_DATA_SOURCE_NAME: z.url().optional(),
	SENTRY_RELEASE: z.string().min(1).optional(),
});

const productionEnvSchema = envSchema.extend({
	SENTRY_DATA_SOURCE_NAME: z.url(),
	SENTRY_RELEASE: z.string().min(1),
});

export const {
	DISCORD_TOKEN,
	APMEKEN_AMETHYST_ROLE_ID,
	SCABARITE_CRYSTAL_ROLE_ID,
	MENAPHITE_GIFTS_ROLE_ID,
	WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID,
	GUTHIXIAN_CACHE_ROLE_ID,
	SNOWVERLOAD_ROLE_ID,
	NOTIFICATIONS_CHANNEL_ID,
	SENTRY_DATA_SOURCE_NAME,
	SENTRY_RELEASE,
} = (PRODUCTION ? productionEnvSchema : envSchema).parse(process.env);
