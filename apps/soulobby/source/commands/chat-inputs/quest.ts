import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { playerQuests, QuestStatus } from "runescape";
import pino from "../../pino.js";
import { isRSN } from "../../utility/functions.js";

// Quest titles are the same for every player, so one response provides them for everyone.
let questTitles: readonly string[] = [];

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

		const data = await playerQuests({ name }).catch((error) =>
			pino.warn(error, "Error fetching quest data."),
		);

		if (!data) {
			await interaction.editReply(
				`Cannot find the quests of \`${name}\`. The account may not exist or may be hidden from public view.`,
			);

			return;
		}

		const questData = Object.values(data.quests).find(({ title }) => title === quest);

		if (!questData) {
			await interaction.editReply(`Couldn't find the quest \`${quest}\`.`);
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
		const { options } = interaction;
		const focused = options.getFocused().value.toUpperCase();
		const name = options.getString("name");

		if (questTitles.length === 0 && name && isRSN(name)) {
			// Autocomplete must respond within 3 seconds and this request can take that long.
			void playerQuests({ name })
				.then(({ quests }) => {
					questTitles = Object.values(quests)
						.map(({ title }) => title)
						.toSorted();
				})
				.catch((error) => pino.warn(error, "Error fetching quest data."));
		}

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
