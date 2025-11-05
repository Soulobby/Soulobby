import {
	ActionRowBuilder,
	type ChatInputCommandInteraction,
	ComponentType,
	DangerButtonBuilder,
	DiscordjsError,
	DiscordjsErrorCodes,
	type Message,
	MessageFlags,
	SuccessButtonBuilder,
} from "discord.js";
import { CALL_CACHE } from "../../caches/calls.js";
import {
	CorruptedEggCall,
	type CorruptedEggCallLocation,
	type CorruptedEggPacket,
} from "../../models/Calls.js";
import pg, { Table } from "../../pg.js";
import { GENERAL_ROLE_ID, QUEUE_CHAT_CHANNEL_ID } from "../../utility/configuration.js";
import { CallType } from "../../utility/constants.js";
import { equalRSN, isP2PServer } from "../../utility/functions.js";

export default {
	name: "egg" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		switch (interaction.options.getSubcommand()) {
			case "edit": {
				await this.edit(interaction);
				return;
			}
			case "info": {
				await this.info(interaction);
			}
		}
	},
	async edit(interaction: ChatInputCommandInteraction<"cached">) {
		const { channelId, client, member, options, user } = interaction;
		const queueChat = client.channel(QUEUE_CHAT_CHANNEL_ID);

		if (channelId !== queueChat.id) {
			await interaction.reply({
				content: `Please use this command in ${queueChat}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const eggNo = options.getInteger("number", true);

		const corruptedEggPacket = await pg<CorruptedEggPacket>(Table.CorruptedEggs)
			.where({ id: eggNo })
			.first();

		if (!corruptedEggPacket) {
			await interaction.reply("Cannot interpret the provided corrupted egg.");
			return;
		}

		const world = options.getInteger("world", true);
		const location = options.getInteger("location", true) as CorruptedEggCallLocation;
		const RSN = options.getString("name");

		if (!isP2PServer(world)) {
			await interaction.reply("Cannot interpret the provided corrupted egg.");
			return;
		}

		if (!member.roles.cache.has(GENERAL_ROLE_ID)) {
			if (user.id !== corruptedEggPacket.user_id) {
				await interaction.reply("You can only edit your own corrupted egg calls.");
				return;
			}

			if (Date.now() - corruptedEggPacket.timestamp.getTime() > 50_400_000) {
				await interaction.reply(
					"You cannot edit corrupted egg calls that have been recorded for longer than 14 hours.",
				);

				return;
			}
		}

		if (
			corruptedEggPacket.world === world &&
			corruptedEggPacket.location === location &&
			equalRSN(corruptedEggPacket.logged_for ?? "", RSN ?? "")
		) {
			await interaction.reply("You are attempting to edit a corrupted egg to what it already is.");
			return;
		}

		const button = new SuccessButtonBuilder()
			.setCustomId(`YES-${corruptedEggPacket.id}`)
			.setLabel("Yes");

		const button2 = new DangerButtonBuilder()
			.setCustomId(`NO-${corruptedEggPacket.id}`)
			.setLabel("No");

		const actionRow = new ActionRowBuilder().addComponents(button, button2);
		const data = { ...corruptedEggPacket, logged_for: RSN, world, location };

		const response = await interaction.reply({
			components: [actionRow],
			content: "Is this okay?",
			embeds: [await CorruptedEggCall.embed(interaction.client, data, true)],
			withResponse: true,
		});

		try {
			const successfulInteraction = await (
				response.resource!.message! as Message<true>
			).awaitMessageComponent({
				componentType: ComponentType.Button,
				filter: async (verificationInteraction) => {
					if (verificationInteraction.user.id === user.id) {
						return true;
					}

					await verificationInteraction.reply({
						content: "The one who initiated this command must reply.",
						flags: MessageFlags.Ephemeral,
					});

					return false;
				},
				time: 30_000,
			});

			if (successfulInteraction.customId.startsWith("YES")) {
				await successfulInteraction.deferUpdate();
				await CorruptedEggCall.edit(successfulInteraction, data);

				if (isP2PServer(corruptedEggPacket.world) && corruptedEggPacket.world !== world) {
					CALL_CACHE.get(corruptedEggPacket.world)![CallType.CorruptedEgg]?.update(
						interaction.client,
						data,
					);
				}

				return;
			}

			await successfulInteraction.update({
				components: [],
				content: "Edit cancelled.",
				embeds: [],
			});
		} catch (error) {
			if (
				error instanceof DiscordjsError &&
				error.code === DiscordjsErrorCodes.InteractionCollectorError
			) {
				await interaction.editReply({
					components: [],
					content: "This process has taken too long and has been cancelled.",
					embeds: [],
				});

				return;
			}

			void interaction.client.log({
				content: "Failed to edit a corrupted egg.",
				error,
			});

			await interaction.editReply({
				components: [],
				content: "Encountered an error whilst editing this corrupted egg.",
				embeds: [],
			});
		}
	},
	async info(interaction: ChatInputCommandInteraction<"cached">) {
		const eggNo = interaction.options.getInteger("number", true);

		const corruptedEggPacket = await pg<CorruptedEggPacket>(Table.CorruptedEggs)
			.where({ id: eggNo })
			.first();

		if (!corruptedEggPacket) {
			await interaction.reply("Cannot interpret the provided corrupted egg.");
			return;
		}

		await interaction.reply({
			embeds: [await CorruptedEggCall.embed(interaction.client, corruptedEggPacket, true)],
		});
	},
} as const;
