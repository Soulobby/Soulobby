import type { ChatInputCommandInteraction } from "discord.js";
import Friend, { isRank } from "../../models/Friend.js";
import { isRSN } from "../../utility/functions.js";

export default {
	name: "friend" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		switch (interaction.options.getSubcommand()) {
			case "add": {
				await this.add(interaction);
				return;
			}
			case "edit": {
				await this.edit(interaction);
				return;
			}
			case "rank": {
				await this.rank(interaction);
				return;
			}
			case "remove": {
				await this.remove(interaction);
				return;
			}
			case "unset": {
				await this.unset(interaction);
			}
		}
	},
	async add(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const { options } = interaction;
		const RSN = options.getString("name", true);
		const rank = options.getString("rank", true);
		const user = options.getUser("user");
		const mainId = options.getInteger("main");

		if (!isRSN(RSN)) {
			await interaction.editReply("Cannot interpret the provided RSN.");
			return;
		}

		if (!isRank(rank)) {
			throw new ReferenceError("Unable to identify the rank.");
		}
		let mainFriend: Friend | null = null;

		for (const friend of Friend.cache.values()) {
			if (friend.userId === user?.id) {
				await interaction.editReply("This user is already known.");
				return;
			}

			if (friend.currentRSN === RSN && friend.isAdded()) {
				await interaction.editReply("This RSN is already known.");
				return;
			}

			if (friend.id === mainId) {
				mainFriend = friend;
			}
		}

		if (mainId !== null) {
			if (mainFriend === null) {
				await interaction.editReply("Cannot interpret the provided main account.");
				return;
			}

			if (mainFriend.mainId !== null) {
				await interaction.editReply(
					`Cannot create a rank with the main of \`${mainFriend.RSN}\` - this account is an alternative account.`,
				);

				return;
			}
		}

		await Friend.create(interaction, {
			user_id: user?.id ?? null,
			main_id: mainId,
			initial_RSN: RSN,
			current_RSN: RSN,
			history: [{ rank, date: interaction.createdTimestamp }],
		});
	},
	async edit(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const { options } = interaction;
		const friend = Friend.cache.get(options.getInteger("number", true));

		if (!friend) {
			await interaction.editReply("Cannot interpret the provided rank.");
			return;
		}

		if (options.data[0].options!.length === 1) {
			await interaction.editReply("There was nothing to edit.");
			return;
		}

		let payloadDerankTimestamp: "??" | string | number | null =
			options.getInteger("derank-timestamp") ?? friend.derankTimestamp;
		if (typeof payloadDerankTimestamp === "number") {
			payloadDerankTimestamp = String(payloadDerankTimestamp);
		}

		let friendDerankTimestamp: "??" | string | number | null = friend.derankTimestamp;
		if (typeof friendDerankTimestamp === "number") {
			friendDerankTimestamp = String(friendDerankTimestamp);
		}

		const payload = {
			user_id: options.getUser("user")?.id ?? friend.userId,
			main_id: options.getInteger("main") ?? friend.mainId,
			alt_id: friend.altId,
			current_RSN: options.getString("current-name") ?? friend.currentRSN,
			derank_timestamp: payloadDerankTimestamp,
			reason: options.getString("reason") ?? friend.reason,
		};

		if (
			payload.user_id === friend.userId &&
			payload.main_id === friend.mainId &&
			payload.current_RSN === friend.currentRSN &&
			payload.derank_timestamp === friendDerankTimestamp &&
			payload.reason === friend.reason
		) {
			await interaction.editReply("There was nothing to edit.");
			return;
		}

		if (
			payload.user_id !== friend.userId &&
			Friend.cache.some((friend) => friend.userId === payload.user_id)
		) {
			await interaction.editReply("There already exists an account currently added with that id.");
			return;
		}

		if (payload.main_id !== friend.mainId) {
			if (payload.main_id === null) {
				throw new ReferenceError("Attempted to get a `null` value of Friend.");
			}

			const mainFriend = Friend.cache.get(payload.main_id);

			if (!mainFriend) {
				await interaction.editReply("Cannot interpret the provided main account.");
				return;
			}

			if (mainFriend.mainId !== null) {
				await interaction.editReply("This account is an alternative account.");
				return;
			}
		}

		if (payload.current_RSN !== friend.currentRSN && !isRSN(payload.current_RSN)) {
			await interaction.editReply("Cannot interpret the provided current RSN.");
			return;
		}

		if (!friend.isRemoved() && payload.derank_timestamp !== null) {
			await interaction.editReply(
				"The derank timestamp can only be altered if the account is no longer ranked.",
			);

			return;
		}

		if (
			friend.isRemoved() &&
			payload.derank_timestamp !== friendDerankTimestamp &&
			friend.addedTimestamp !== "??" &&
			payload.derank_timestamp
		) {
			const convertedPayloadDerankTimestamp = Number(payload.derank_timestamp);

			if (convertedPayloadDerankTimestamp < friend.addedTimestamp) {
				await interaction.editReply(
					"Derank timestamp cannot be earlier than a rank's creation timestamp!",
				);

				return;
			}
		}

		if (!friend.isRemoved() && payload.reason !== null) {
			await interaction.editReply(
				"The reason can only be altered if the account is no longer ranked.",
			);

			return;
		}

		if (friend.isRemoved() && payload.reason !== friend.reason) {
			if (payload.reason === null) {
				throw new ReferenceError("Somehow received a non-string reason to use.");
			}

			if (payload.reason.length > 1_024) {
				await interaction.editReply("Reason must not exceed 1024 characters.");
				return;
			}
		}

		await friend.edit(payload, interaction);
	},
	async rank(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const { options } = interaction;
		const friend = Friend.cache.get(options.getInteger("number", true));
		const rank = options.getString("rank", true);

		if (!friend) {
			await interaction.editReply("Cannot interpret the provided rank.");
			return;
		}

		if (!friend.isAdded()) {
			await interaction.editReply("This account is not currently added.");
			return;
		}

		if (!isRank(rank)) {
			throw new ReferenceError("Unable to identify the rank.");
		}

		if (rank === "Captain" || rank === "General") {
			await interaction.editReply(
				`You are missing permissions to rank \`${friend.RSN}\` to that rank.`,
			);
			return;
		}

		if (rank === friend.rank) {
			await interaction.editReply(`\`${friend.RSN}\` is already that rank.`);
			return;
		}

		await friend.alterRank(interaction, {
			history: [...friend.history, { rank, date: interaction.createdTimestamp }],
		});
	},
	async remove(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const { options } = interaction;
		const friend = Friend.cache.get(options.getInteger("number", true));
		const reason = options.getString("reason", true);

		if (!friend) {
			await interaction.editReply("Cannot interpret the provided rank.");
			return;
		}

		if (friend.isRemoved()) {
			await interaction.editReply("This account is already removed.");
			return;
		}

		if (friend.rank === "Captain" || friend.rank === "General") {
			await interaction.editReply(`You are missing permissions to derank \`${friend.RSN}\`.`);
			return;
		}

		if (reason.length > 1_024) {
			await interaction.editReply("Reason must not exceed 1024 characters.");
			return;
		}

		await friend.remove(interaction, {
			derank_timestamp: String(interaction.createdTimestamp),
			reason,
		});
	},
	async unset(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const friend = Friend.cache.get(options.getInteger("number", true));
		const userId = options.getBoolean("user");
		const mainId = options.getBoolean("main");

		if (!friend) {
			await interaction.reply("Cannot interpret the provided rank.");
			return;
		}

		if (!(userId === true || mainId === true)) {
			await interaction.reply("There was nothing to unset.");
			return;
		}

		if (friend.userId === null && userId === true) {
			await interaction.reply(`\`${friend.RSN}\` does not have a Discord account linked already.`);
			return;
		}

		if (friend.mainId === null && mainId === true) {
			await interaction.reply(
				`\`${friend.RSN}\` does not have a registered main account linked already.`,
			);

			return;
		}

		await friend.edit(
			{
				user_id: userId === true ? null : friend.userId,
				main_id: mainId === true ? null : friend.mainId,
				alt_id: friend.altId,
				current_RSN: friend.currentRSN,
				derank_timestamp:
					typeof friend.derankTimestamp === "number"
						? String(friend.derankTimestamp)
						: friend.derankTimestamp,
				reason: friend.reason,
			},
			interaction,
		);
	},
} as const;
