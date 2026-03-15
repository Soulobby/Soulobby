import { channelMention, messageLink } from "@discordjs/formatters";
import {
	type AutocompleteInteraction,
	ChannelType,
	type ChatInputCommandInteraction,
	MessageFlags,
} from "discord.js";
import { type CasesPacket, caseAutocomplete, edit } from "../../features/cases-discord.js";
import pg, { Table } from "../../pg.js";
import { DISCORD_CASES_CHANNEL_ID, TOPICS_CHANNEL_ID } from "../../utility/configuration.js";

export default {
	name: "case" as const,
	async autocomplete(interaction: AutocompleteInteraction<"cached">) {
		const focused = interaction.options.getFocused().value;
		await interaction.respond(await caseAutocomplete(focused));
	},
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		switch (interaction.options.getSubcommandGroup()) {
			case "discord": {
				await this.discord(interaction);
				return;
			}
		}
	},
	async discord(interaction: ChatInputCommandInteraction<"cached">) {
		switch (interaction.options.getSubcommand()) {
			case "edit": {
				await this.discordEdit(interaction);
				return;
			}
		}
	},
	async discordEdit(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const id = options.getInteger("case", true);
		const reason = options.getString("reason") ?? undefined;
		const topicsThread = options.getChannel("topics-thread", false, [ChannelType.PublicThread]);

		if (!(reason || topicsThread)) {
			await interaction.reply({ content: "Nothing to edit.", flags: MessageFlags.Ephemeral });
			return;
		}

		if (topicsThread && topicsThread.parentId !== TOPICS_CHANNEL_ID) {
			await interaction.reply({
				content: `${topicsThread} is not in ${channelMention(TOPICS_CHANNEL_ID)}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (!(await pg<CasesPacket>(Table.CasesDiscord).select(pg.raw("1")).where({ id }).first())) {
			await interaction.reply({ content: "Case does not exist.", flags: MessageFlags.Ephemeral });
			return;
		}

		const messageId = await edit(interaction.client, {
			caseNumber: id,
			reason,
			topicsThreadId: topicsThread?.id,
		});

		await interaction.reply({
			content: `Case updated${messageId ? `: ${messageLink(DISCORD_CASES_CHANNEL_ID, messageId, interaction.guildId)}` : "."}`,
			flags: MessageFlags.Ephemeral,
		});
	},
} as const;
