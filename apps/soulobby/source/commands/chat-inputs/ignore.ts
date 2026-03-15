import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "@discordjs/builders";
import { type Attachment, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { hash } from "hasha";
import sharp from "sharp";
import Ignore from "../../models/Ignore.js";
import S3Client from "../../s3-client.js";
import { CDN_BUCKET } from "../../utility/configuration.js";
import { ALLOWED_MEDIA_TYPES } from "../../utility/constants.js";
import { isRSN } from "../../utility/functions.js";

export const IGNORE_LIST_EVIDENCE_REMOVAL_STRING_SELECT_MENU_CUSTOM_ID =
	"IGNORE_LIST_EVIDENCE_REMOVAL_STRING_SELECT_MENU_CUSTOM_ID" as const;

export default {
	name: "ignore" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		switch (interaction.options.getSubcommandGroup(false) ?? interaction.options.getSubcommand()) {
			case "add": {
				await this.add(interaction);
				return;
			}
			case "edit": {
				await this.edit(interaction);
				return;
			}
			case "evidence": {
				await this.evidence(interaction);
				return;
			}
			case "remove": {
				await this.remove(interaction);
			}
		}
	},
	async add(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const RSN = options.getString("name", true);
		const reason = options.getString("reason", true);

		if (!isRSN(RSN)) {
			await interaction.reply("Cannot interpret the provided RSN.");
			return;
		}

		if (reason.length > 1_024) {
			await interaction.reply("Reason must not exceed 1024 characters.");
			return;
		}

		const evidence = options.data[0]
			.options!.filter(({ name }) => name.startsWith("evidence"))
			.map(({ attachment }) => attachment) as Attachment[];

		if (
			evidence.some(
				({ contentType }) =>
					!ALLOWED_MEDIA_TYPES.includes(contentType as (typeof ALLOWED_MEDIA_TYPES)[number]),
			)
		) {
			await interaction.editReply(
				`Evidence needs to be in the following format:\n${ALLOWED_MEDIA_TYPES.map(
					(allowedContentType) => `- ${allowedContentType}`,
				).join("\n")}`,
			);

			return;
		}

		const fetchedEvidence = await Promise.all(evidence.map(async ({ url }) => fetch(url)));

		const arrayBuffers = await Promise.all(
			fetchedEvidence.map(async (response) => response.arrayBuffer()),
		);

		const data = await Promise.all(
			arrayBuffers.map(async (arrayBuffer) => {
				const buffer = await sharp(arrayBuffer).webp().toBuffer();
				return { buffer, hash: await hash(buffer, { algorithm: "md5" }) };
			}),
		);

		await Ignore.create(interaction, {
			initial_RSN: RSN,
			current_RSN: RSN,
			ban_timestamp: interaction.createdAt,
			reason,
			evidence: data,
		});
	},
	async edit(interaction: ChatInputCommandInteraction<"cached">) {
		await interaction.deferReply();
		const { options } = interaction;
		const ignore = Ignore.cache.get(options.getInteger("number", true));

		if (!ignore) {
			await interaction.editReply("Cannot interpret the provided account.");
			return;
		}

		if (options.data[0].options!.length === 1) {
			await interaction.editReply("There was nothing to edit.");
			return;
		}

		const payload = {
			current_RSN: options.getString("current-name") ?? ignore.currentRSN,
			reason: options.getString("reason") ?? ignore.reason,
			evidence: ignore.evidence,
		};

		if (payload.current_RSN === ignore.currentRSN && payload.reason === ignore.reason) {
			await interaction.editReply("There was nothing to edit.");
			return;
		}

		if (payload.current_RSN !== ignore.currentRSN && !isRSN(payload.current_RSN)) {
			await interaction.editReply("Cannot interpret the provided current RSN.");
			return;
		}

		if (payload.reason !== ignore.reason && payload.reason.length > 1_024) {
			await interaction.reply("Reason must not exceed 1024 characters.");
			return;
		}

		await ignore.edit(interaction, payload);
	},
	async evidence(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const suppliedOptions = options.data[0].options![0].options!;
		const ignore = Ignore.cache.get(options.getInteger("number", true));

		if (!ignore) {
			await interaction.reply("Cannot interpret the provided account.");
			return;
		}

		if (!ignore.isBanned()) {
			await interaction.reply("This account is not currently banned.");
			return;
		}

		if (options.getSubcommand() === "add") {
			if (suppliedOptions.length === 1) {
				await interaction.reply("There was no evidence to modify.");
				return;
			}

			await interaction.deferReply();

			const evidence = suppliedOptions
				.filter(({ name }) => name.startsWith("evidence"))
				.map(({ attachment }) => attachment) as Attachment[];

			if (
				evidence.some(
					({ contentType }) =>
						!ALLOWED_MEDIA_TYPES.includes(contentType as (typeof ALLOWED_MEDIA_TYPES)[number]),
				)
			) {
				await interaction.editReply(
					`Evidence needs to be in the following format:\n${ALLOWED_MEDIA_TYPES.map(
						(allowedContentType) => `- ${allowedContentType}`,
					).join("\n")}`,
				);

				return;
			}

			const fetchedEvidence = await Promise.all(evidence.map(async ({ url }) => fetch(url)));

			const arrayBuffers = await Promise.all(
				fetchedEvidence.map(async (response) => response.arrayBuffer()),
			);

			const data = await Promise.all(
				arrayBuffers.map(async (arrayBuffer) => {
					const buffer = await sharp(arrayBuffer).webp().toBuffer();
					return { buffer, hash: await hash(buffer, { algorithm: "md5" }) };
				}),
			);

			const hashes = data.map(({ hash }) => hash);

			if (ignore.evidence.some((hash) => hashes.includes(hash))) {
				await interaction.editReply("One or more supplied evidence already exists.");
				return;
			}

			for (const { buffer, hash } of data) {
				await S3Client.send(
					new PutObjectCommand({
						Bucket: CDN_BUCKET,
						Key: Ignore.evidenceRoute(ignore.id, hash),
						Body: buffer,
						ContentDisposition: "inline",
						ContentType: "image/webp",
					}),
				);
			}

			hashes.unshift(...ignore.evidence);

			await ignore.edit(interaction, {
				current_RSN: ignore.currentRSN,
				reason: ignore.reason,
				evidence: hashes,
			});

			return;
		}

		if (ignore.evidence.length === 0) {
			await interaction.reply("There is no evidence to remove.");
			return;
		}

		await interaction.reply({
			components: [
				new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(
							`${IGNORE_LIST_EVIDENCE_REMOVAL_STRING_SELECT_MENU_CUSTOM_ID}§${ignore.id}`,
						)
						.setMaxValues(ignore.evidence.length)
						.setMinValues(1)
						.setOptions(
							ignore.evidence.map((hash, index) =>
								new StringSelectMenuOptionBuilder().setLabel(String(index + 1)).setValue(hash),
							),
						)
						.setPlaceholder("Select the evidence to remove."),
				),
			],
			flags: MessageFlags.Ephemeral,
		});
	},
	async remove(interaction: ChatInputCommandInteraction<"cached">) {
		const ignore = Ignore.cache.get(interaction.options.getInteger("number", true));

		if (!ignore) {
			await interaction.reply("Cannot interpret the provided account.");
			return;
		}

		if (!ignore.isBanned()) {
			await interaction.reply("This account is not currently banned.");
			return;
		}

		await ignore.remove(interaction);
	},
} as const;
