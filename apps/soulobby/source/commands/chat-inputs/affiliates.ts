import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { affiliates } from "../../features/affiliates.js";

export default {
	name: "affiliates" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		await affiliates({ interaction });
		await interaction.editReply("Successfully updated affiliates!");
	},
} as const;
