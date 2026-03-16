import { API, MessageFlags, type Snowflake } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { captureCheckIn } from "@sentry/node";
import { Cron } from "croner";
import { Jewel, jewel } from "runescape";
import pino from "./pino.js";
import {
	APMEKEN_AMETHYST_ROLE_ID,
	DISCORD_TOKEN,
	NOTIFICATIONS_CHANNEL_ID,
	SCABARITE_CRYSTAL_ROLE_ID,
	SNOWVERLOAD_ROLE_ID,
} from "./utility/configuration.js";
import { isChristmas2025Event } from "./utility/functions.js";

const client = new API(new REST({ version: "10" }).setToken(DISCORD_TOKEN));

interface NotificationsData {
	roleId: Snowflake;
	content: string;
}

new Cron("* * * * *", async () => {
	const checkInId = captureCheckIn({ monitorSlug: "notifications", status: "in_progress" });
	const date = new Date();
	date.setUTCSeconds(0, 0);
	const hours = date.getUTCHours();
	const minutes = date.getUTCMinutes();
	const now = date.getTime();
	const notifications: NotificationsData[] = [];

	if (hours === 0 && minutes === 0) {
		switch (jewel(now)) {
			case Jewel.ApmekenAmethyst:
				notifications.push({
					roleId: APMEKEN_AMETHYST_ROLE_ID,
					content: `The <@&${APMEKEN_AMETHYST_ROLE_ID}> is accessible today.`,
				});
				break;
			case Jewel.ScabariteCrystal:
				notifications.push({
					roleId: SCABARITE_CRYSTAL_ROLE_ID,
					content: `The <@&${SCABARITE_CRYSTAL_ROLE_ID}> is accessible today.`,
				});
				break;
		}
	}

	if (minutes === 40 && isChristmas2025Event(now)) {
		const futureDate = new Date(now + 300000);

		notifications.push({
			roleId: SNOWVERLOAD_ROLE_ID,
			content: `<@&${SNOWVERLOAD_ROLE_ID}> spawns <t:${futureDate.getTime() / 1000}:R>!`,
		});
	}

	const notificationsSettled = await Promise.allSettled(
		notifications.map(
			async ({ roleId, content }) =>
				await client.channels.createMessage(NOTIFICATIONS_CHANNEL_ID, {
					allowed_mentions: { roles: [roleId] },
					content,
					enforce_nonce: true,
					flags: MessageFlags.SuppressEmbeds,
					nonce: roleId,
				}),
		),
	);

	const errors: unknown[] = [];

	for (const result of notificationsSettled) {
		if (result.status !== "rejected") {
			continue;
		}

		errors.push(result.reason);
	}

	if (errors.length > 0) {
		pino.error(new AggregateError(errors, "Error whilst sending notifications."));
	}

	captureCheckIn({
		monitorSlug: "notifications",
		status: "ok",
		checkInId,
		duration: Math.floor((Date.now() - now) / 1000),
	});
});
