import {
	ChannelType,
	type ChatInputCommandInteraction,
	channelMention,
	MessageFlags,
	messageLink,
} from "discord.js";
import { type CreateKickCaseOptions, createKick } from "../../features/cases-discord.js";
import { DISCORD_CASES_CHANNEL_ID, TOPICS_CHANNEL_ID } from "../../utility/configuration.js";

export default {
	name: "kick" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const user = options.getUser("user", true);
		const member = options.getMember("user");
		const reason = options.getString("reason");
		const topicsThread = options.getChannel("topics-thread", false, [ChannelType.PublicThread]);

		if (!member) {
			await interaction.reply({
				content: `${user} is not in the server.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (!member.kickable) {
			await interaction.reply({
				content: `Missing permissions to kick ${user}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (interaction.member.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
			await interaction.reply({
				content: `You are unable to kick ${user}.`,
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

		const createKickCaseOptions: CreateKickCaseOptions = {
			kick: true,
			guild: interaction.guild,
			user,
			topicsThread,
			actor: interaction.user,
			createdAt: interaction.createdAt,
		};

		if (reason) {
			createKickCaseOptions.reason = reason;
		}

		const messageId = await createKick(createKickCaseOptions);

		await interaction.reply({
			content: `${user} has been kicked: ${messageLink(DISCORD_CASES_CHANNEL_ID, messageId, interaction.guildId)}`,
			flags: MessageFlags.Ephemeral,
		});
	},
} as const;
