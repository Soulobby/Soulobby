import { API, MessageFlags, type Snowflake } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { captureCheckIn } from "@sentry/node";
import { Cron } from "croner";
import {
	guthixianCache,
	Item,
	Jewel,
	jewel,
	stock,
	WildernessFlashEvent,
	wildernessFlashEvent,
} from "runescape";
import pino from "./pino.js";
import {
	APMEKEN_AMETHYST_ROLE_ID,
	DISCORD_TOKEN,
	GUTHIXIAN_CACHE_ROLE_ID,
	MENAPHITE_GIFTS_ROLE_ID,
	NOTIFICATIONS_CHANNEL_ID,
	SCABARITE_CRYSTAL_ROLE_ID,
	SNOWVERLOAD_ROLE_ID,
	WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID,
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

		if (
			stock(now).some(
				(item) =>
					item === Item.MenaphiteGiftOfferingLarge ||
					item === Item.MenaphiteGiftOfferingMedium ||
					item === Item.MenaphiteGiftOfferingSmall,
			)
		) {
			notifications.push({
				roleId: MENAPHITE_GIFTS_ROLE_ID,
				content: `The Travelling Merchant has <@&${MENAPHITE_GIFTS_ROLE_ID}> in stock today!`,
			});
		}
	}

	if (minutes === 55) {
		const futureDate = new Date(now + 300000);
		const futureDateMilliseconds = futureDate.getTime();

		if (guthixianCache(futureDateMilliseconds)) {
			notifications.push({
				roleId: GUTHIXIAN_CACHE_ROLE_ID,
				content: `A <@&${GUTHIXIAN_CACHE_ROLE_ID}> will open <t:${futureDateMilliseconds / 1000}:R> with full rewards!`,
			});
		}

		switch (wildernessFlashEvent(futureDateMilliseconds)) {
			case WildernessFlashEvent.KingBlackDragonRampage:
				notifications.push({
					roleId: WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID,
					content: `<@&${WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID}> The King Black Dragon will rampage <t:${futureDateMilliseconds / 1000}:R>!`,
				});

				break;
			case WildernessFlashEvent.InfernalStar:
				notifications.push({
					roleId: WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID,
					content: `<@&${WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID}> An infernal star will land <t:${futureDateMilliseconds / 1000}:R>!`,
				});

				break;
			case WildernessFlashEvent.EvilBloodwoodTree:
				notifications.push({
					roleId: WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID,
					content: `<@&${WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID}> An evil bloodwood tree will grow <t:${futureDateMilliseconds / 1000}:R>!`,
				});

				break;
			case WildernessFlashEvent.StrykeTheWyrm:
				notifications.push({
					roleId: WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID,
					content: `<@&${WILDERNESS_FLASH_EVENT_SPECIAL_ROLE_ID}> The WildyWyrm will burrow to the surface <t:${futureDateMilliseconds / 1000}:R>!`,
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
