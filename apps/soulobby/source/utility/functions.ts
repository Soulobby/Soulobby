import { URL } from "node:url";
import {
	type Attachment,
	Collection,
	time as discordTime,
	type Guild,
	type GuildMember,
	type GuildTextBasedChannel,
	hideLinkEmbed,
	hyperlink,
	type Message,
	MessageType,
	type PartialGuildMember,
	type PartialMessage,
	PermissionFlagsBits,
	type Snowflake,
	type TextBasedChannel,
	TimestampStyles,
	type TimestampStylesString,
	type User,
} from "discord.js";
import type { MessagesPacket } from "../features/message-log.js";
import pg, { Table } from "../pg.js";
import {
	CDN_URL,
	MESSAGE_LOG_EXPLICIT_ALLOWED_CHANNEL_IDS,
	MESSAGE_LOG_EXPLICIT_DISALLOWED_CHANNEL_IDS,
} from "./configuration.js";
import {
	ALLOWED_MEDIA_TYPES,
	DailyCat,
	MAXIMUM_ASSET_SIZE,
	P2P_ENGLISH_SERVERS,
	P2P_SERVERS,
	type P2PEnglishServers,
	SMALL_XP_LAMP_EXPERIENCE,
} from "./constants.js";

export const enum LogType {
	Default = 0,
	CorruptedEggQueue = 1,
	RankApplication = 2,
	QuickQuizLog = 3,
}

export function isValidAttachment(attachment: Attachment) {
	return (
		attachment.size <= MAXIMUM_ASSET_SIZE &&
		ALLOWED_MEDIA_TYPES.some((mediaType) => attachment.contentType === mediaType)
	);
}

export function displayAvatarURL(guildMemberOrUser: GuildMember | PartialGuildMember | User) {
	return guildMemberOrUser.displayAvatarURL({ extension: "webp", size: 4_096 });
}

export function isRSN(RSN: string) {
	return /^[\w- ]{0,12}(?<![ _-])$/.test(RSN);
}

export function equalRSN(RSN1: string, RSN2: string) {
	return RSN1.toLowerCase().replaceAll(/-| /g, "_") === RSN2.toLowerCase().replaceAll(/-| /g, "_");
}

export function isP2PServer(server: number): server is (typeof P2P_SERVERS)[typeof server] {
	return P2P_SERVERS.includes(server as (typeof P2P_SERVERS)[typeof server]);
}

export function isP2PEnglishServer(server: number): server is P2PEnglishServers {
	return P2P_ENGLISH_SERVERS.includes(server as P2PEnglishServers);
}

export function isLevel(level: string): level is keyof typeof SMALL_XP_LAMP_EXPERIENCE {
	return Object.keys(SMALL_XP_LAMP_EXPERIENCE).includes(String(level));
}

export async function deleteAllMessages(channel: GuildTextBasedChannel): Promise<void> {
	const deletedMessages = await channel.bulkDelete(100);

	if (deletedMessages.length === 100) {
		return deleteAllMessages(channel);
	}
}

export async function fetchAllMessages(
	channel: TextBasedChannel,
	messages = new Collection<Snowflake, Message>(),
	before?: Snowflake,
): Promise<Collection<Snowflake, Message>> {
	const fetchedMessages = await channel.messages.fetch({ limit: 100, before });

	const collectedMessages = messages.concat(fetchedMessages);

	return fetchedMessages.size === 100
		? fetchAllMessages(channel, collectedMessages, fetchedMessages.lastKey())
		: collectedMessages.reverse();
}

export async function transcript(messages: Collection<Snowflake, Message | PartialMessage>) {
	const transcriptedMessages: string[] = [];

	for (const message of messages.values()) {
		const { attachments, author, components, createdTimestamp, embeds, id, stickers, type } =
			message;
		let { content } = message;
		let resolvedAttachments = attachments.map(({ proxyURL }) => proxyURL);
		let tag = author?.tag;
		let userId = author?.id;

		if (message.partial) {
			const databaseMessage = await pg<MessagesPacket>(Table.Messages)
				.select("user_id", "content", "attachments")
				.where({ message_id: id });

			userId = databaseMessage[0]?.user_id ?? userId;
			content = databaseMessage[0]?.content ?? content;
			resolvedAttachments = databaseMessage[0]?.attachments ?? attachments;
		}

		if (!tag && userId) {
			const user = await message.client.users.fetch(userId, { cache: false });
			tag = user.tag;
		}

		tag ??= "UNKNOWN USER";
		let parsedMessage = `[${new Date(createdTimestamp).toISOString()}] ${tag}${userId ? ` (${userId})` : ""}: `;

		switch (type) {
			case MessageType.ChannelPinnedMessage: {
				transcriptedMessages.push(`${parsedMessage}${tag} pinned a message to this channel.`);
				continue;
			}

			case MessageType.UserJoin: {
				transcriptedMessages.push(`${parsedMessage}${tag} joined the server!`);
				continue;
			}
		}

		parsedMessage +=
			content === null ? "UNKNOWN CONTENT" : `${content}${content.length === 0 ? "" : "\n"}`;

		if (stickers.size > 0) {
			const stickerNames = stickers.map(({ name }) => name);

			parsedMessage += `${tag} Sent ${stickerNames.length === 1 ? "a sticker" : "some stickers"}: ${stickerNames.join(
				" & ",
			)}\n`;
		}

		if (resolvedAttachments.length > 0) {
			parsedMessage += `${resolvedAttachments.join("\n")}\n`;
		}

		if (components.length > 0) {
			parsedMessage += `${JSON.stringify(components)}\n`;
		}

		if (embeds.length > 0) {
			parsedMessage += `${JSON.stringify(embeds)}\n`;
		}

		transcriptedMessages.push(parsedMessage.trim());
	}

	return transcriptedMessages;
}

export function evidenceFormat(
	id: number,
	evidence: string[],
	route: (id: number, hash: string) => string,
	hide = false,
) {
	return (
		evidence
			.map((_evidence, No) => {
				const url = String(new URL(route(id, _evidence), CDN_URL));
				return hyperlink(String(No + 1), hide ? hideLinkEmbed(url) : url);
			})
			.join(" | ") || null
	);
}

export function time(timestamp: bigint | number, style: TimestampStylesString, relative = false) {
	const resolvedTimestamp =
		typeof timestamp === "bigint" ? Number(timestamp / 1_000n) : Math.floor(timestamp / 1_000);

	return `${discordTime(resolvedTimestamp, style)}${
		relative ? ` (${discordTime(resolvedTimestamp, TimestampStyles.RelativeTime)})` : ""
	}`;
}

export function isCaseId(number: number) {
	return Number.isInteger(number) && number > 0 && number <= 2_147_483_647;
}

export function cat(offset = 0) {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + offset);

	switch (date.getUTCDay()) {
		case 2: {
			return DailyCat.Lucifurr;
		}
		case 3: {
			return DailyCat.Takhuit;
		}
		case 4: {
			return DailyCat.Fenekh;
		}
		case 5: {
			return DailyCat.Nodjmet;
		}
		case 6: {
			return DailyCat.Blanchy;
		}
		case 0: {
			return DailyCat.Hetepheres;
		}
		default: {
			return null;
		}
	}
}

interface ShouldLogMessageOptions {
	bot: boolean;
	channel: GuildTextBasedChannel;
	guild: Guild;
}

export function shouldLogMessage({ bot, channel, guild }: ShouldLogMessageOptions) {
	// Do not log bots.
	if (bot) {
		return;
	}

	// Is the channel itself explicitly allowed?
	if (MESSAGE_LOG_EXPLICIT_ALLOWED_CHANNEL_IDS.includes(channel.id)) {
		return true;
	}

	// Is the channel itself explicitly ignored?
	if (MESSAGE_LOG_EXPLICIT_DISALLOWED_CHANNEL_IDS.includes(channel.id)) {
		return false;
	}

	// Is the parent channel for threads explicitly allowed?
	if (channel.isThread() && MESSAGE_LOG_EXPLICIT_ALLOWED_CHANNEL_IDS.includes(channel.id)) {
		return true;
	}

	// Is the parent channel for threads explicitly ignored?
	if (channel.isThread() && MESSAGE_LOG_EXPLICIT_DISALLOWED_CHANNEL_IDS.includes(channel.id)) {
		return false;
	}

	// Check for categories.
	const categoryId = channel.parentId;

	if (categoryId) {
		if (MESSAGE_LOG_EXPLICIT_ALLOWED_CHANNEL_IDS.includes(categoryId)) {
			return true;
		}

		if (MESSAGE_LOG_EXPLICIT_DISALLOWED_CHANNEL_IDS.includes(categoryId)) {
			return false;
		}
	}

	// Lastly, is the channel public?
	return channel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.ViewChannel);
}
