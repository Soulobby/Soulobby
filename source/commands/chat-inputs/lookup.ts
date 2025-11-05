import { type ChatInputCommandInteraction, EmbedBuilder, hyperlink } from "discord.js";
import {
	avatar,
	clanPage,
	hiScore,
	playerDetails,
	playerPage,
	profile,
	QuestStatus,
	QuestTitle,
	questDetails,
} from "runescape";
import { consoleLog, isRSN } from "../../utility/functions.js";

export default {
	name: "lookup" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const name = interaction.options.getString("name", true);

		if (!isRSN(name)) {
			await interaction.editReply("Cannot interpret the provided RSN.");
			return;
		}

		const data =
			(await profile({ activities: 0, name }).catch(consoleLog)) ??
			(await hiScore({ name }).catch(consoleLog));

		if (!data) {
			await interaction.editReply(
				`Cannot find the HiScores of \`${name}\` and the RuneMetrics profile was not public. Does this account exist?`,
			);

			return;
		}

		const RSN = "name" in data ? data.name : name;
		const totalLevel = "totalSkill" in data ? data.totalSkill : data.total.level;
		const [{ clan }] = await playerDetails({ names: [RSN] });
		let title: string;
		const hasMenaphosAccess = `\`${RSN}\` has Menaphos access.` as const;

		if ("questsNotStarted" in data && data.questsNotStarted === 0 && data.questsStarted === 0) {
			// All quests complete! This saves an API request.
			title = hasMenaphosAccess;
		} else {
			const { quests } = await questDetails({ name: RSN });
			const questData = quests.find(({ title }) => title === QuestTitle.TheJackOfSpades);

			switch (questData?.status) {
				case QuestStatus.NotStarted: {
					title = `\`${RSN}\` does not have Menaphos access.`;
					break;
				}
				case QuestStatus.Started: {
					title = `\`${RSN}\` could have access (quest in progress).`;
					break;
				}
				case QuestStatus.Completed: {
					title = hasMenaphosAccess;
					break;
				}
				default: {
					title = `The RuneMetrics profile of \`${RSN}\` is not public.`;
					break;
				}
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
					value: `${totalLevel}\n-# ${Object.entries(playerPage({ name: RSN }))
						.map(([source, url]) => hyperlink(source, url))
						.join(" | ")}`,
				},
				{
					name: "Clan",
					value: clan
						? `${clan}\n-# ${Object.entries(clanPage({ clan }))
								.map(([source, url]) => hyperlink(source, url))
								.join(" | ")}`
						: "None",
				},
			);

		await interaction.editReply({ embeds: [embed] });
	},
} as const;
