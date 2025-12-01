import { Events } from "discord.js";
import { handleAutoModerationActionExecution } from "../features/cases-discord.js";
import { GUILD_ID } from "../utility/configuration.js";
import type { Event } from "./index.js";

const name = Events.AutoModerationActionExecution;

export default {
	name,
	async fire(autoModerationActionExecution) {
		if (autoModerationActionExecution.guild.id !== GUILD_ID) {
			return;
		}

		await handleAutoModerationActionExecution(autoModerationActionExecution);
	},
} satisfies Event<typeof name>;
