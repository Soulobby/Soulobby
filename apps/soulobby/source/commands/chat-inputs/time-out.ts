import { channelMention, messageLink } from "@discordjs/formatters";
import { ChannelType, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { type CreateTimeOutCaseOptions, createTimeOut } from "../../features/cases-discord.js";
import { DISCORD_CASES_CHANNEL_ID, TOPICS_CHANNEL_ID } from "../../utility/configuration.js";

export default {
	name: "time-out" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const user = options.getUser("user", true);
		const member = options.getMember("user");
		const duration = options.getInteger("duration", true);
		const reason = options.getString("reason");
		const topicsThread = options.getChannel("topics-thread", false, [ChannelType.PublicThread]);

		if (!member) {
			await interaction.reply({
				content: `${user} is not in the server.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (!member.moderatable) {
			await interaction.reply({
				content: `Missing permissions to time out ${user}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (interaction.member.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
			await interaction.reply({
				content: `You are unable to time out ${user}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (topicsThread && topicsThread.parentId !== TOPICS_CHANNEL_ID) {
			await interaction.reply({
				content: `${topicsThread} is not in ${channelMention(TOPICS_CHANNEL_ID)}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const createTimeOutCaseOptions: CreateTimeOutCaseOptions = {
			timeOut: true,
			guild: interaction.guild,
			user,
			topicsThread,
			actor: interaction.user,
			createdAt: interaction.createdAt,
			actionEndsAt: new Date(interaction.createdTimestamp + duration),
		};

		if (reason) {
			createTimeOutCaseOptions.reason = reason;
		}

		const messageId = await createTimeOut(createTimeOutCaseOptions);

		await interaction.reply({
			content: `${user} has been timed out: ${messageLink(DISCORD_CASES_CHANNEL_ID, messageId, interaction.guildId)}`,
			flags: MessageFlags.Ephemeral,
		});
	},
} as const;
