import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { QuestStatus, QuestTitle, questDetails } from "runescape";
import { isRSN } from "../../utility/functions.js";

const questTitles = Object.values(QuestTitle);

export default {
	name: "quest" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const { options } = interaction;
		const name = options.getString("name", true);
		const quest = options.getString("quest", true);

		if (!isRSN(name)) {
			await interaction.editReply("Cannot interpret the provided RSN.");
			return;
		}

		const { quests } = await questDetails({ name });
		const questData = quests.find(({ title }) => title === quest);

		if (!questData) {
			await interaction.editReply(
				`Couldn't find the quest \`${quest}\`. The RuneMetrics profile of \`${name}\` may not be public, or the account may not exist.`,
			);

			return;
		}

		switch (questData.status) {
			case QuestStatus.NotStarted: {
				await interaction.editReply(`\`${name}\` has not completed ${quest}.`);
				return;
			}
			case QuestStatus.Started: {
				await interaction.editReply(`\`${name}\` has started ${quest}.`);
				return;
			}
			case QuestStatus.Completed: {
				await interaction.editReply(`\`${name}\` has completed ${quest}.`);
				return;
			}
		}
	},
	async autocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		const focused = interaction.options.getFocused().value.toUpperCase();

		await interaction.respond(
			focused === ""
				? []
				: questTitles
						.filter((questTitle) => questTitle.toUpperCase().includes(focused))
						.map((questTitle) => ({
							name: questTitle,
							value: questTitle,
						}))
						.slice(0, 25),
		);
	},
} as const;
