import { EmbedBuilder } from "@discordjs/builders";
import { hyperlink } from "@discordjs/formatters";
import type { ChatInputCommandInteraction } from "discord.js";
import {
	avatar,
	clanPage,
	clanPageRunepixels,
	hiScore,
	hiScoreComparePage,
	playerDetails,
	playerPageRunepixels,
	playerQuests,
	QuestId,
	QuestStatus,
} from "runescape";
import pino from "../../pino.js";
import { isRSN } from "../../utility/functions.js";

export default {
	name: "lookup" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const name = interaction.options.getString("name", true);

		if (!isRSN(name)) {
			await interaction.editReply("Cannot interpret the provided RSN.");
			return;
		}

		const [hiScoreData, questData] = await Promise.all([
			hiScore({ name }).catch((error) => pino.warn(error, "Error fetching HiScore data.")),
			playerQuests({ name }).catch((error) => pino.warn(error, "Error fetching quest data.")),
		]);

		if (!(hiScoreData || questData)) {
			await interaction.editReply(
				`Cannot find the HiScores or quests of \`${name}\`. Does this account exist?`,
			);

			return;
		}

		const RSN = questData ? questData.name : name;
		const [{ clan }] = await playerDetails({ names: [RSN] });
		let title: string;

		switch (questData ? questData.quests[QuestId.TheJackOfSpades].status : null) {
			case QuestStatus.NotStarted: {
				title = `\`${RSN}\` does not have Menaphos access.`;
				break;
			}
			case QuestStatus.Started: {
				title = `\`${RSN}\` could have access (quest in progress).`;
				break;
			}
			case QuestStatus.Completed: {
				title = `\`${RSN}\` has Menaphos access.`;
				break;
			}
			default: {
				title = `The quests of \`${RSN}\` are not available.`;
				break;
			}
		}

		const embed = new EmbedBuilder()
			.setAuthor({
				name: RSN,
				icon_url: avatar({ name: RSN }),
			})
			.setColor((await interaction.client.guild.members.fetchMe()).displayColor)
			.setDescription(title)
			.setFields(
				{
					name: "HiScores",
					value: `${hiScoreData ? hiScoreData.overall.level : "Unknown"}\n-# ${hyperlink("RuneScape", hiScoreComparePage(RSN))} | ${hyperlink("Runepixels", playerPageRunepixels(RSN))}`,
				},
				{
					name: "Clan",
					value: clan
						? `${clan}\n-# ${hyperlink("RuneScape", clanPage(clan))} | ${hyperlink("Runepixels", clanPageRunepixels(clan))}`
						: "None",
				},
			);

		await interaction.editReply({ embeds: [embed] });
	},
} as const;
