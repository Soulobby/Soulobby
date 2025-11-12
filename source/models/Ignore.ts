import type { Buffer } from "node:buffer";
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
	ChannelType,
	type ChatInputCommandInteraction,
	type Client,
	Collection,
	EmbedBuilder,
	hyperlink,
	messageLink,
	type Snowflake,
	type StringSelectMenuInteraction,
	TimestampStyles,
} from "discord.js";
import pg, { Table } from "../pg.js";
import S3Client from "../s3-client.js";
import {
	CDN_BUCKET,
	EX_IGNORE_LIST_CHANNEL_ID,
	GAME_CASES_CHANNEL_ID,
	GUILD_ID,
} from "../utility/configuration.js";
import { evidenceFormat, time } from "../utility/functions.js";
import Base from "./Base.js";

export interface IgnorePacket {
	id: number;
	initial_RSN: string;
	current_RSN: string;
	ban_timestamp: Date;
	unban_timestamp: Date | null;
	reason: string;
	evidence: string[];
	message_id: Snowflake | null;
}

interface IgnoreData {
	id: number;
	initialRSN: string;
	currentRSN: string;
	banTimestamp: Date;
	unbanTimestamp: Date | null;
	reason: string;
	evidence: string[];
	messageId: Snowflake | null;
}

type IgnorePatchData = Omit<IgnorePacket, "id" | "initial_RSN" | "ban_timestamp">;

interface IgnoreCreateEvidenceData {
	buffer: Buffer;
	hash: string;
}

interface IgnoreCreateData
	extends Omit<IgnorePacket, "id" | "unban_timestamp" | "evidence" | "message_id"> {
	evidence: IgnoreCreateEvidenceData[];
}

type IgnoreEditData = Pick<IgnorePacket, "current_RSN" | "reason" | "evidence">;

export default class Ignore extends Base {
	public static readonly cache = new Collection<number, Ignore>();

	public readonly id: IgnoreData["id"];

	public readonly initialRSN: IgnoreData["initialRSN"];

	public currentRSN!: IgnoreData["currentRSN"];

	public readonly banTimestamp: IgnoreData["banTimestamp"];

	public unbanTimestamp!: IgnoreData["unbanTimestamp"];

	public reason!: IgnoreData["reason"];

	public evidence!: IgnoreData["evidence"];

	public messageId!: IgnoreData["messageId"];

	public constructor(client: Client, data: IgnorePacket) {
		super(client);
		this.id = data.id;
		this.initialRSN = data.initial_RSN;
		this.banTimestamp = data.ban_timestamp;
		this.patch(data);
	}

	private patch(data: IgnorePatchData) {
		this.currentRSN = data.current_RSN;
		this.unbanTimestamp = data.unban_timestamp;
		this.reason = data.reason;
		this.evidence = data.evidence;
		this.messageId = data.message_id;
	}

	public static async create(
		interaction: ChatInputCommandInteraction<"cached">,
		{ evidence, ...data }: IgnoreCreateData,
	) {
		const [packet] = await pg<IgnorePacket>(Table.IgnoreList).insert(data).returning("*");
		const ignore = new this(interaction.client, packet);

		for (const { buffer, hash } of evidence) {
			await S3Client.send(
				new PutObjectCommand({
					Bucket: CDN_BUCKET,
					Key: this.evidenceRoute(ignore.id, hash),
					Body: buffer,
					ContentDisposition: "inline",
					ContentType: "image/webp",
				}),
			);
		}

		const [packet2] = await pg<IgnorePacket>(Table.IgnoreList)
			// @ts-expect-error Apparently, you must JSON.stringify() arrays. TypeScript does not like this.
			.update({ evidence: JSON.stringify(evidence.map(({ hash }) => hash)) })
			.where({ id: ignore.id })
			.returning("*");

		ignore.patch(packet2);

		const { id: messageId, url } = await interaction.client
			.channel(GAME_CASES_CHANNEL_ID, ChannelType.GuildText)
			.send({ embeds: [await ignore.ignoreEmbed()] });

		const [packet3] = await pg<IgnorePacket>(Table.IgnoreList)
			.update({ message_id: messageId })
			.where({ id: ignore.id })
			.returning("*");

		ignore.patch(packet3);
		this.cache.set(ignore.id, ignore);

		await interaction.reply(
			`Successfully added ${hyperlink(`\`${ignore.RSN}\``, url)} to the ignore list.`,
		);
	}

	public async edit(
		interaction: ChatInputCommandInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
		data: IgnoreEditData,
	) {
		const [packet] = await pg<IgnorePacket>(Table.IgnoreList)
			// @ts-expect-error Apparently, you must JSON.stringify() arrays. TypeScript does not like this.
			.update({ ...data, evidence: JSON.stringify(data.evidence) })
			.where({ id: this.id })
			.returning("*");

		let editMessage = `Successfully edited the data of [\`${this.RSN}\`](<${messageLink(
			this.isBanned() ? this.ignoreList.id : this.exIgnoreList.id,
			this.messageId!,
			GUILD_ID,
		)}>).`;

		if (this.currentRSN !== data.current_RSN) {
			editMessage += `\nCurrent RSN altered from \`${this.currentRSN}\` to \`${data.current_RSN}\`.`;
		}

		if (this.reason !== data.reason) {
			editMessage += `\nReason altered from \`${this.reason}\` to \`${data.reason}\`.`;
		}

		if (this.evidence.length !== data.evidence.length) {
			editMessage += `\nEvidence ${
				this.evidence.length === 0
					? "is now"
					: `altered from ${evidenceFormat(this.id, this.evidence, Ignore.evidenceRoute, true)} to`
			} ${evidenceFormat(this.id, data.evidence, Ignore.evidenceRoute, true) ?? "nothing"}.`;
		}

		this.patch(packet);
		await this.updateIgnore();
		await interaction.editReply({ components: [], content: editMessage });
	}

	public async remove(interaction: ChatInputCommandInteraction<"cached">) {
		const [packet] = await pg<IgnorePacket>(Table.IgnoreList)
			.update({ unban_timestamp: interaction.createdAt })
			.where({ id: this.id })
			.returning("*");

		this.patch(packet);
		await this.ignoreList.messages.delete(this.messageId!);

		const { id: messageId, url } = await this.exIgnoreList.send({
			embeds: [await this.ignoreEmbed()],
		});

		const [packet2] = await pg<IgnorePacket>(Table.IgnoreList)
			.update({ message_id: messageId })
			.where({ id: this.id })
			.returning("*");

		this.patch(packet2);

		await interaction.reply(`Successfully removed [\`${this.RSN}\`](${url}) from the ignore list.`);
	}

	public static async removeEvidence(
		interaction: StringSelectMenuInteraction<"cached">,
		id: number,
	) {
		const { component, values } = interaction;
		await interaction.deferUpdate();
		const ignore = this.cache.get(id);

		if (!ignore) {
			await interaction.editReply({
				components: [],
				content: "Cannot interpret the provided account.",
			});

			return;
		}

		if (!ignore.isBanned()) {
			await interaction.editReply({
				components: [],
				content: "This account is not currently banned.",
			});

			return;
		}

		if (component.data.options.length !== ignore.evidence.length) {
			await interaction.editReply({
				components: [],
				content: "The evidence list has been updated since. Please try again.",
			});

			return;
		}

		await S3Client.send(
			new DeleteObjectsCommand({
				Bucket: CDN_BUCKET,
				Delete: { Objects: values.map((value) => ({ Key: Ignore.evidenceRoute(id, value) })) },
			}),
		);

		await ignore.edit(interaction, {
			current_RSN: ignore.currentRSN,
			reason: ignore.reason,
			evidence: ignore.evidence.filter((hash) => !values.includes(hash)),
		});
	}

	public async updateIgnore() {
		await (this.isBanned() ? this.ignoreList : this.exIgnoreList).messages.edit(this.messageId!, {
			embeds: [await this.ignoreEmbed()],
		});
	}

	public static evidenceRoute(this: void, id: number, hash: string) {
		return `ignores/${id}/${hash}.webp`;
	}

	public get ignoreList() {
		return this.client.channel(GAME_CASES_CHANNEL_ID, ChannelType.GuildText);
	}

	public get exIgnoreList() {
		return this.client.channel(EX_IGNORE_LIST_CHANNEL_ID, ChannelType.GuildText);
	}

	public get RSN() {
		return this.currentRSN;
	}

	public isBanned(): this is this & { messageId: Snowflake; unbanTimestamp: null } {
		return this.unbanTimestamp === null;
	}

	public isUnbanned(): this is this & { messageId: Snowflake; unbanTimestamp: Date } {
		return this.unbanTimestamp !== null;
	}

	public async ignoreEmbed() {
		return new EmbedBuilder()
			.setColor((await this.client.guild.members.fetchMe()).displayColor)
			.setDescription(
				`Current RSN: \`${this.RSN}\`\nBanned: ${time(this.banTimestamp.getTime(), TimestampStyles.FullDateShortTime)}${
					this.isUnbanned()
						? `\nUnbanned: ${time(this.unbanTimestamp.getTime(), TimestampStyles.FullDateShortTime)}`
						: ""
				}`,
			)
			.setFields(
				{ name: "__Reason__", value: this.reason },
				{
					name: "__Evidence__",
					value: evidenceFormat(this.id, this.evidence, Ignore.evidenceRoute) ?? "None",
				},
			)
			.setFooter({ text: `#${this.id}` })
			.setTitle(this.initialRSN);
	}
}
