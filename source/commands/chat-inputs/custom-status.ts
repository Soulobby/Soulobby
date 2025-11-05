import { ActivityType, type ChatInputCommandInteraction, MessageFlags } from "discord.js";

export default {
	name: "custom-status" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		const text = interaction.options.getString("text", true);

		interaction.client.user.setPresence({
			activities: [{ name: text, type: ActivityType.Custom }],
		});

		await interaction.reply({ content: "Custom status set.", flags: MessageFlags.Ephemeral });
	},
} as const;
