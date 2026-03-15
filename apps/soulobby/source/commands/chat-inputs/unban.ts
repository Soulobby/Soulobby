import { channelMention, messageLink } from "@discordjs/formatters";
import {
	ChannelType,
	type ChatInputCommandInteraction,
	DiscordAPIError,
	MessageFlags,
	RESTJSONErrorCodes,
} from "discord.js";
import { createUnban } from "../../features/cases-discord.js";
import { DISCORD_CASES_CHANNEL_ID, TOPICS_CHANNEL_ID } from "../../utility/configuration.js";

export default {
	name: "unban" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const user = options.getUser("user", true);
		const reason = options.getString("reason", true);
		const topicsThread = options.getChannel("topics-thread", true, [ChannelType.PublicThread]);

		if (topicsThread.parentId !== TOPICS_CHANNEL_ID) {
			await interaction.reply({
				content: `${topicsThread} is not in ${channelMention(TOPICS_CHANNEL_ID)}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		try {
			await interaction.guild.bans.fetch(user);

			const messageId = await createUnban({
				unban: true,
				guild: interaction.guild,
				user,
				reason,
				actor: interaction.user,
				topicsThread,
				createdAt: interaction.createdAt,
			});

			await interaction.reply({
				content: `${user} has been unbanned: ${messageLink(DISCORD_CASES_CHANNEL_ID, messageId, interaction.guildId)}`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownBan) {
				await interaction.reply({
					content: `${user} is not banned.`,
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			// This is unexpected.
			throw error;
		}
	},
} as const;
