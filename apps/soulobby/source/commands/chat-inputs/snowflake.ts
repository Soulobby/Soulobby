import { EmbedBuilder } from "@discordjs/builders";
import { TimestampStyles } from "@discordjs/formatters";
import {
	type ChatInputCommandInteraction,
	type DeconstructedSnowflake,
	MessageFlags,
	SnowflakeUtil,
} from "discord.js";
import { time } from "../../utility/functions.js";

export default {
	name: "snowflake" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		switch (interaction.options.getSubcommand()) {
			case "deconstruct": {
				await this.deconstruct(interaction);
				return;
			}
			case "difference": {
				await this.difference(interaction);
			}
		}
	},
	async deconstruct(interaction: ChatInputCommandInteraction<"cached">) {
		let snowflake: DeconstructedSnowflake;

		try {
			snowflake = SnowflakeUtil.deconstruct(interaction.options.getString("snowflake", true));
		} catch {
			await interaction.reply({
				content: "Cannot interpret the provided value.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const embed = new EmbedBuilder()
			.setColor((await interaction.client.guild.members.fetchMe()).displayColor)
			.setDescription(
				`Created: ${time(snowflake.timestamp, TimestampStyles.FullDateShortTime, true)}\nTimestamp: \`${
					snowflake.timestamp
				}\``,
			)
			.setFields(
				{ name: "Worker Id", value: String(snowflake.workerId), inline: true },
				{ name: "Process Id", value: String(snowflake.processId), inline: true },
				{ name: "Increment", value: String(snowflake.increment), inline: true },
			)
			.setTitle("Snowflake Deconstruction");

		await interaction.reply({ embeds: [embed] });
	},
	async difference(interaction: ChatInputCommandInteraction<"cached">) {
		let snowflake1: DeconstructedSnowflake;
		let snowflake2: DeconstructedSnowflake;

		try {
			snowflake1 = SnowflakeUtil.deconstruct(interaction.options.getString("snowflake-1", true));
			snowflake2 = SnowflakeUtil.deconstruct(interaction.options.getString("snowflake-2", true));
		} catch {
			await interaction.reply({
				content: "Cannot interpret the provided value.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const difference = Math.abs(Number(snowflake1.timestamp - snowflake2.timestamp));
		await interaction.reply(`${difference} millisecond${difference === 1 ? "" : "s"}.`);
	},
} as const;
