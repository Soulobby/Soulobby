import {
	type AutocompleteInteraction,
	ChannelType,
	type ChatInputCommandInteraction,
	channelMention,
	DiscordAPIError,
	MessageFlags,
	messageLink,
	RESTJSONErrorCodes,
} from "discord.js";
import {
	banAutocomplete,
	type CreateBanCaseOptions,
	createBan,
} from "../../features/cases-discord.js";
import { DISCORD_CASES_CHANNEL_ID, TOPICS_CHANNEL_ID } from "../../utility/configuration.js";

export default {
	name: "ban" as const,
	async autocomplete(interaction: AutocompleteInteraction<"cached">) {
		const focused = interaction.options.getFocused().value;
		await interaction.respond(banAutocomplete(focused));
	},
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const user = options.getUser("user", true);
		const member = options.getMember("user");
		const deleteMessageSeconds = options.getInteger("delete-message-time") ?? 0;
		const reason = options.getString("reason");
		const topicsThread = options.getChannel("topics-thread", false, [ChannelType.PublicThread]);

		if (member) {
			if (!member.bannable) {
				await interaction.reply({
					content: `Missing permissions to ban ${user}.`,
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			if (interaction.member.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
				await interaction.reply({
					content: `You are unable to ban ${user}.`,
					flags: MessageFlags.Ephemeral,
				});

				return;
			}
		}

		if (topicsThread && topicsThread.parentId !== TOPICS_CHANNEL_ID) {
			await interaction.reply({
				content: `${topicsThread} is not in ${channelMention(TOPICS_CHANNEL_ID)}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		try {
			await interaction.guild.bans.fetch(user);

			await interaction.reply({
				content: `${user} is already banned.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		} catch (error) {
			if (error instanceof DiscordAPIError && error.code !== RESTJSONErrorCodes.UnknownBan) {
				// This is unexpected.
				throw error;
			}
		}

		const createBanCaseOptions: CreateBanCaseOptions = {
			ban: true,
			guild: interaction.guild,
			user,
			deleteMessageSeconds,
			topicsThread,
			actor: interaction.user,
			createdAt: interaction.createdAt,
		};

		if (reason) {
			createBanCaseOptions.reason = reason;
		}

		const messageId = await createBan(createBanCaseOptions);

		await interaction.reply({
			content: `${user} has been banned: ${messageLink(DISCORD_CASES_CHANNEL_ID, messageId, interaction.guildId)}`,
			flags: MessageFlags.Ephemeral,
		});
	},
} as const;
