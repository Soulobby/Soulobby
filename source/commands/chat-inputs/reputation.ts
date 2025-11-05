import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { avatar, profile, QuestStatus, QuestTitle, questDetails, SkillId } from "runescape";
import { SMALL_XP_LAMP_EXPERIENCE } from "../../utility/constants.js";
import { consoleLog, isLevel, isRSN } from "../../utility/functions.js";

export default {
	name: "reputation" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		switch (interaction.options.getSubcommand()) {
			case "calculate": {
				await this.calculate(interaction);
				return;
			}
			case "information": {
				await this.information(interaction);
			}
		}
	},
	async calculate(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const initial = options.getInteger("initial", true);
		const final = options.getInteger("final", true);
		const quest = options.getNumber("quest", true);

		if (initial === 1_200_000) {
			await interaction.reply("Maximum reputation achieved. There is nothing to calculate.");
			return;
		}

		if (initial >= final) {
			await interaction.reply("You have already met your goal.");
			return;
		}

		const reputationRemaining = final - initial;
		const cap = 20_060 * quest;
		const daysLeft = Math.ceil(reputationRemaining / cap);

		await interaction.reply(
			`It will take ${daysLeft} day${
				daysLeft === 1 ? "" : "s"
			} to gain ${reputationRemaining.toLocaleString()} reputation.`,
		);
	},
	async information(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const name = interaction.options.getString("name", true);

		if (!isRSN(name)) {
			await interaction.editReply("Cannot interpret the provided RSN.");
			return;
		}

		const profileData = await profile({ activities: 0, name }).catch(consoleLog);

		if (!profileData) {
			await interaction.editReply(`The RuneMetrics profile of \`${name}\` is not public.`);
			return;
		}

		const RSN = profileData.name;
		const { quests } = await questDetails({ name });
		const theJackofSpades = quests.find(({ title }) => title === QuestTitle.TheJackOfSpades);

		if (!theJackofSpades) {
			throw new ReferenceError(
				`Cannot find ${QuestTitle.TheJackOfSpades} quest. Did Jagex change the name?`,
			);
		}

		if (theJackofSpades.status !== QuestStatus.Completed) {
			await interaction.editReply(
				`\`${RSN}\` does not have Menaphos access. This command is not useable.`,
			);
			return;
		}

		const crocodileTears = quests.find(({ title }) => title === QuestTitle.CrocodileTears);

		if (!crocodileTears) {
			throw new ReferenceError(
				`Cannot find the ${QuestTitle.CrocodileTears} quest. Did Jagex change the name?`,
			);
		}

		const ourManInTheNorth = quests.find(({ title }) => title === QuestTitle.OurManInTheNorth);

		if (!ourManInTheNorth) {
			throw new ReferenceError(
				`Cannot find the ${QuestTitle.OurManInTheNorth} quest. Did Jagex change the name?`,
			);
		}

		const phiteClub = quests.find(({ title }) => title === QuestTitle.PhiteClub);

		if (!phiteClub) {
			throw new ReferenceError(
				`Cannot find the ${QuestTitle.PhiteClub} quest. Did Jagex change the name?`,
			);
		}

		const pharaohsFolly = quests.find(({ title }) => title === QuestTitle.PharaohsFolly);

		if (!pharaohsFolly) {
			throw new ReferenceError(
				`Cannot find the ${QuestTitle.PharaohsFolly} quest. Did Jagex change the name?`,
			);
		}

		const theJackofSpadesStatus = "**Completed!**";
		let crocodileTearsStatus = "Incomplete!";
		let ourManInTheNorthStatus = "Incomplete!";
		let phiteClubStatus = "Incomplete!";
		let pharaohsFollyStatus = "Incomplete!";
		let reputationModifier = 1.25;

		let nextQuest =
			"The next quest in line is [Crocodile Tears](https://runescape.wiki/w/Crocodile_Tears).";

		if (crocodileTears.status === "COMPLETED") {
			crocodileTearsStatus = "**Completed!**";
			reputationModifier = 1.5;

			nextQuest =
				"The next quest in line is [Our Man in the North](https://runescape.wiki/w/Our_Man_in_the_North).";

			if (ourManInTheNorth.status === "COMPLETED") {
				ourManInTheNorthStatus = "**Completed!**";
				reputationModifier = 1.75;

				nextQuest =
					"The next quest in line is ['Phite Club](https://runescape.wiki/w/%27Phite_Club).";

				if (phiteClub.status === "COMPLETED") {
					phiteClubStatus = "**Completed!**";
					reputationModifier = 2;

					nextQuest =
						"The next quest in line is [Pharaoh's Folly](https://runescape.wiki/w/Pharaoh%27s_Folly).";

					if (pharaohsFolly.status === "COMPLETED") {
						pharaohsFollyStatus = "**Completed!**";
						reputationModifier = 2.5;
						nextQuest = `\`${RSN}\` has the highest possible reputation multiplier.`;
					}
				}
			}
		}

		const slayerLevel = String(
			profileData.skillValues.find(({ id }) => id === SkillId.Slayer)!.level,
		);

		if (!isLevel(slayerLevel)) {
			throw new ReferenceError(
				"Provided Slayer level was not indexed in the small experience lamp object.",
			);
		}

		const [sOneRep, sOneExp] = this.scarabsCalc(slayerLevel, reputationModifier, 1);
		const [sTwoRep, sTwoExp] = this.scarabsCalc(slayerLevel, reputationModifier, 0.5);
		const [sThreeRep, sThreeExp] = this.scarabsCalc(slayerLevel, reputationModifier, 0.33);
		const [sFourRep, sFourExp] = this.scarabsCalc(slayerLevel, reputationModifier, 0.25);
		const [sFiveRep, sFiveExp] = this.scarabsCalc(slayerLevel, reputationModifier, 0.2);

		const finalScarabsCalc = `Upon bursting 60 corrupted scarabs, ${(
			Math.round(
				((SMALL_XP_LAMP_EXPERIENCE[slayerLevel] / 5) * 23 +
					(SMALL_XP_LAMP_EXPERIENCE[slayerLevel] / 5) * 0.5 * 12 +
					(SMALL_XP_LAMP_EXPERIENCE[slayerLevel] / 5) * 0.33 * 12 +
					(SMALL_XP_LAMP_EXPERIENCE[slayerLevel] / 5) * 0.25 * 12 +
					(SMALL_XP_LAMP_EXPERIENCE[slayerLevel] / 5) * 0.2) *
					10,
			) / 10
		).toLocaleString()} experience will be gained and ${(
			50 *
				(reputationModifier * 23 +
					reputationModifier * 0.5 * 12 +
					reputationModifier * 0.33 * 12 +
					reputationModifier * 0.25 * 12 +
					reputationModifier * 0.2)
		).toLocaleString()} reputation will be gained.`;

		const embed = new EmbedBuilder()
			.setAuthor({ name: RSN, icon_url: avatar({ name: RSN }) })
			.setColor((await interaction.client.guild.members.fetchMe()).displayColor)
			.setDescription(
				`**Soul Obelisk Cap**: ${(20_060 * reputationModifier).toLocaleString()}\n${nextQuest}`,
			)
			.setFields(
				{ name: QuestTitle.TheJackOfSpades, value: theJackofSpadesStatus },
				{ name: QuestTitle.CrocodileTears, value: crocodileTearsStatus },
				{ name: QuestTitle.OurManInTheNorth, value: ourManInTheNorthStatus },
				{ name: QuestTitle.PhiteClub, value: phiteClubStatus },
				{ name: QuestTitle.PharaohsFolly, value: pharaohsFollyStatus },
				{
					name: `Corrupted Scarabs Table (${slayerLevel} Slayer)`,
					value: `\`\`\`Markdown\n${"Scarabs Slain".padEnd(16)}${"Reputation".padEnd(13)}Experience\n${"01-23".padEnd(
						16,
					)}${sOneRep.padEnd(13)}${sOneExp}\n${"24-35".padEnd(16)}${sTwoRep.padEnd(13)}${sTwoExp}\n${"36-47".padEnd(
						16,
					)}${sThreeRep.padEnd(13)}${sThreeExp}\n${"48-59".padEnd(16)}${sFourRep.padEnd(13)}${sFourExp}\n${"60+".padEnd(
						16,
					)}${sFiveRep.padEnd(13)}${sFiveExp}\`\`\`\n${finalScarabsCalc}`,
				},
			)
			.setTitle("__Menaphos Reputation Analysis__");

		await interaction.editReply({ embeds: [embed] });
	},
	scarabsCalc(
		level: keyof typeof SMALL_XP_LAMP_EXPERIENCE,
		reputationModifier: number,
		multiplier: number,
	): [string, number] {
		return [
			String(50 * reputationModifier * multiplier),
			Math.round((SMALL_XP_LAMP_EXPERIENCE[level] / 5) * multiplier * 10) / 10,
		];
	},
} as const;
