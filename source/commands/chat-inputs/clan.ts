import type { ChatInputCommandInteraction } from "discord.js";
import { clanPage, playerDetails } from "runescape";
import { isRSN } from "../../utility/functions.js";

export default {
	name: "clan" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const name1 = interaction.options.getString("name-1", true);
		const name2 = interaction.options.getString("name-2");
		const name3 = interaction.options.getString("name-3");
		const name4 = interaction.options.getString("name-4");
		const name5 = interaction.options.getString("name-5");
		const name6 = interaction.options.getString("name-6");
		const name7 = interaction.options.getString("name-7");
		const name8 = interaction.options.getString("name-8");
		const name9 = interaction.options.getString("name-9");
		const name10 = interaction.options.getString("name-10");

		const names = [name1, name2, name3, name4, name5, name6, name7, name8, name9, name10].filter(
			(name) => name !== null,
		);

		if (names.some((name) => !isRSN(name))) {
			await interaction.editReply("Cannot interpret a provided RSN. Check your input.");
			return;
		}

		const content: string[] = [];

		for (const { clan, name } of await playerDetails({ names })) {
			if (!clan) {
				content.push(`\`${name}\` is not in a clan.`);
				continue;
			}

			const clanPages = clanPage({ clan });
			const mainClanLink = clanPages.RuneScape;
			const runepixelsLink = clanPages.Runepixels;

			content.push(
				`\`${name}\` is in the clan \`${clan}\`. (${`[RS](<${mainClanLink}>) | [Rp](<${runepixelsLink}>)`})`,
			);
		}

		await interaction.editReply({
			content:
				content.length === 1 ? content[0] : content.map((result) => `- ${result}`).join("\n"),
		});
	},
} as const;
