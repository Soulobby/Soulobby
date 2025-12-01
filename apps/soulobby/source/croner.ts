import { Cron } from "croner";
import type { Client } from "discord.js";
import { messageLogDeleteOldMessages } from "./features/message-log.js";
import { dailyReset } from "./features/rotations.js";

export default function croner(client: Client<true>) {
	new Cron("0 0 0 * * *", async () => {
		await Promise.all([dailyReset(client), messageLogDeleteOldMessages()]);
	});
}
