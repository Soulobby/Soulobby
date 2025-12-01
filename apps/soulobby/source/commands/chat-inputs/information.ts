import type { ChatInputCommandInteraction } from "discord.js";
import { information } from "../../features/information.js";

export default {
	name: "information" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		await information(interaction);
	},
} as const;
