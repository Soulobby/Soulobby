import { type ChatInputCommandInteraction, type Message, MessageFlags } from "discord.js";

export default {
	name: "purge" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		if (interaction.channel === null) {
			throw new ReferenceError("Cannot find the channel this interaction came from.");
		}

		switch (interaction.options.getSubcommand()) {
			case "until": {
				await this.until(interaction);
				return;
			}
			case "between": {
				await this.between(interaction);
			}
		}
	},
	async until(interaction: ChatInputCommandInteraction<"cached">) {
		if (interaction.channel === null) {
			throw new ReferenceError("Cannot find the channel this interaction came from.");
		}

		const { channel, options } = interaction;

		if (options.data[0].options?.length !== 1) {
			await interaction.reply({
				content: "Only one argument may be supplied.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const snowflake = options.getString("id");
		const number = options.getInteger("number");
		let messages = await channel.messages.fetch({ limit: number ?? 100 });

		if (snowflake !== null) {
			if (!messages.has(snowflake)) {
				await interaction.editReply(
					`The provided message id \`${snowflake}\` could not be found. The message id must be within 100 messages.`,
				);

				return;
			}

			messages = messages.filter(({ id }) => id >= snowflake);
		}

		messages = messages.filter(
			({ createdTimestamp, pinned }) => Date.now() - createdTimestamp < 1_209_600_000 && !pinned,
		);

		if (messages.size === 0) {
			await interaction.editReply(
				"There were no messages to purge. Messages older than 2 weeks and pinned messages cannot be purged.",
			);

			return;
		}

		await channel.bulkDelete(messages);

		await interaction.editReply(
			`Successfully purged ${messages.size} message${messages.size === 1 ? "" : "s"}.`,
		);
	},
	async between(interaction: ChatInputCommandInteraction<"cached">) {
		if (interaction.channel === null) {
			throw new ReferenceError("Cannot find the channel this interaction came from.");
		}
		const { channel, options } = interaction;
		const snowflake1 = options.getString("id-1", true);
		const snowflake2 = options.getString("id-2", true);
		let message1: Message<true>;
		let message2: Message<true>;

		if (snowflake1 === snowflake2) {
			await interaction.reply({
				content: "Error: provided arguments were the same.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			message1 = await channel.messages.fetch(snowflake1);
			message2 = await channel.messages.fetch(snowflake2);

			if (message1.createdTimestamp > message2.createdTimestamp) {
				[message1, message2] = [message2, message1];
			}
		} catch {
			await interaction.editReply("One or more message ids were malformed.");
			return;
		}

		let messages = await channel.messages.fetch({
			limit: 100,
			before: message2.id,
		});

		if (!messages.has(message1.id)) {
			await interaction.editReply(
				"The two message ids were too far apart. The message ids must be within 100 messages.",
			);

			return;
		}

		messages.set(message2.id, message2);

		messages = messages.filter(
			({ id, createdTimestamp, pinned }) =>
				id >= message1.id && Date.now() - createdTimestamp < 1_209_600_000 && !pinned,
		);

		if (messages.size === 0) {
			await interaction.editReply(
				"There were no messages to purge. Messages older than 2 weeks and pinned messages cannot be purged.",
			);

			return;
		}

		await channel.bulkDelete(messages);

		await interaction.editReply(
			`Successfully purged ${messages.size} message${messages.size === 1 ? "" : "s"}.`,
		);
	},
} as const;
