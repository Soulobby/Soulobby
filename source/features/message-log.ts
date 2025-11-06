import { Buffer } from "node:buffer";
import { diffLines, diffWords } from "diff";
import {
	EmbedBuilder,
	hyperlink,
	type Message,
	MessageType,
	messageLink,
	type PartialMessage,
	type ReadonlyCollection,
	type Snowflake,
	type TextBasedChannel,
	type Webhook,
} from "discord.js";
import pg, { Table } from "../pg.js";
import {
	GUILD_ID,
	MESSAGE_LOG_WEBHOOK_ID,
	MESSAGE_LOG_WEBHOOK_TOKEN,
} from "../utility/configuration.js";
import { displayAvatarURL, transcript } from "../utility/functions.js";

export interface MessagesPacket {
	user_id: Snowflake;
	guild_id: Snowflake;
	channel_id: Snowflake;
	message_id: Snowflake;
	content: string;
	attachments: string[];
	replied_id: Snowflake | null;
	created_at: Date;
}

let messageLogWebhook: Webhook | null = null;

export async function messageLogUpsert({
	attachments,
	author,
	channelId,
	content,
	guildId,
	id,
	reference,
	type,
	createdAt
}: Message<true>) {
	await pg<MessagesPacket>(Table.Messages)
		.insert({
			user_id: author.id,
			guild_id: guildId,
			channel_id: channelId,
			message_id: id,
			content,
			attachments: attachments.map(({ proxyURL }) => proxyURL),
			created_at: createdAt,
			replied_id: type === MessageType.Reply ? reference!.messageId! : null,
		})
		.onConflict("message_id")
		.merge(["content", "attachments"]);
}

export async function messageLogDeleteOldMessages() {
	// Delete messages older than 30 days.
	await pg<MessagesPacket>(Table.Messages)
		.delete()
		.where("created_at", "<", new Date(Date.now() - 2592000000));
}

export async function messageLogHandleMessageDelete(message: Message | PartialMessage) {
	messageLogWebhook ??= await message.client.fetchWebhook(
		MESSAGE_LOG_WEBHOOK_ID,
		MESSAGE_LOG_WEBHOOK_TOKEN,
	);

	let { content } = message;
	let userId = message.author?.id;
	let attachments = message.attachments.map(({ proxyURL }) => proxyURL);

	let repliedId =
		message.type === MessageType.Reply ? (message.reference?.messageId ?? null) : null;

	if (message.partial) {
		const databaseMessage = await pg<MessagesPacket>(Table.Messages)
			.select("user_id", "content", "attachments", "replied_id")
			.where({ message_id: message.id })
			.first();

		userId = databaseMessage?.user_id ?? userId;
		content = databaseMessage?.content ?? content;
		attachments = databaseMessage?.attachments ?? attachments;
		repliedId = databaseMessage?.replied_id ?? repliedId;
	}

	if (!userId || content === null) {
		return;
	}

	const [me, author] = await Promise.all([
		message.client.guild.members.fetchMe(),
		message.client.users.fetch(userId),
	]);

	const embed = new EmbedBuilder()
		.setAuthor({
			name: `${author.tag} (${author.id})`,
			icon_url: displayAvatarURL(message.member ?? author),
		})
		.setColor(me.displayColor)
		.setFields(
			{ name: "Channel", value: String(message.channel), inline: true },
			{ name: "Message Link", value: hyperlink("Jump", message.url), inline: true },
		)
		.setTimestamp()
		.setTitle("Message Deleted");

	if (content) {
		embed.setDescription(content);
	}

	if (attachments.length > 0) {
		embed.addFields({
			name: "Attachments",
			value: `${attachments.map((attachment, No) => `[${No + 1}](${attachment})`).join(" | ")}`,
			inline: true,
		});
	}

	if (repliedId !== null) {
		embed.addFields({
			name: "Replied To",
			value: `[Jump](${messageLink(message.channelId, repliedId, GUILD_ID)})`,
			inline: true,
		});
	}

	await messageLogWebhook.send({
		avatarURL: displayAvatarURL(me),
		embeds: [embed],
		username: me.displayName,
	});
}

export async function messageLogHandleMessageDeleteBulk(
	messages: ReadonlyCollection<Snowflake, Message | PartialMessage>,
	channel: TextBasedChannel,
) {
	messageLogWebhook ??= await channel.client.fetchWebhook(
		MESSAGE_LOG_WEBHOOK_ID,
		MESSAGE_LOG_WEBHOOK_TOKEN,
	);

	const clonedMessages = messages.clone();
	const transcriptedMessages = await transcript(clonedMessages.reverse());
	const me = await channel.client.guild.members.fetchMe();

	const embed = new EmbedBuilder()
		.setColor(me.displayColor)
		.setFields(
			{ name: "Channel", value: String(channel), inline: true },
			{ name: "Count", value: String(messages.size), inline: true },
		)
		.setTimestamp()
		.setTitle("Messages Deleted");

	await messageLogWebhook.send({
		avatarURL: displayAvatarURL(me),
		embeds: [embed],
		files: [
			{
				attachment: Buffer.from(transcriptedMessages.join("\n")),
				name: `message-delete-bulk-${Date.now()}.txt`,
			},
		],
		username: me.displayName,
	});
}

export async function messageLogHandleMessageUpdate(
	oldMessage: Message | PartialMessage,
	newMessage: Message<true>,
) {
	messageLogWebhook ??= await newMessage.client.fetchWebhook(
		MESSAGE_LOG_WEBHOOK_ID,
		MESSAGE_LOG_WEBHOOK_TOKEN,
	);

	let oldContent = oldMessage.content;

	if (oldContent === null) {
		const potentialContent = await pg<MessagesPacket>(Table.Messages)
			.select("content")
			.where({ message_id: newMessage.id })
			.first();

		oldContent = potentialContent?.content ?? oldContent;

		if (oldContent === null) {
			return;
		}
	}

	// Only create new entries of messages if they are not older than 30 days.
	if (Date.now() - newMessage.createdTimestamp < 2_592_000_000) {
		await messageLogUpsert(newMessage);
	}

	if (
		oldMessage.content === newMessage.content ||
		(oldContent.length === 0 && newMessage.content.length === 0)
	) {
		return;
	}

	const me = await newMessage.client.guild.members.fetchMe();
	let description = "";

	if (/```.*?```/s.test(oldContent) && /```.*?```/s.test(newMessage.content)) {
		const strippedOldMessage = /```(?:(\S+)\n)?\s*(.+?)\s*```/s.exec(oldContent);

		if (!strippedOldMessage?.[2]) {
			return;
		}

		const strippedNewMessage = /```(?:(\S+)\n)?\s*(.+?)\s*```/s.exec(newMessage.content);

		if (!strippedNewMessage?.[2] || strippedOldMessage[2] === strippedNewMessage[2]) {
			return;
		}

		const diffMessage = diffLines(strippedOldMessage[2], strippedNewMessage[2]);

		for (const part of diffMessage) {
			const text = part.added ? "+ " : part.removed ? "- " : "";
			description += text + part.value;
		}

		description = `\`\`\`diff\n${description}\n\`\`\``;
	} else {
		const diffMessage = diffWords(oldContent, newMessage.content);

		for (const part of diffMessage) {
			const markdown = part.added ? "**" : part.removed ? "~~" : "";
			description += `${markdown}${part.value}${markdown}`;
		}
	}

	const embed = new EmbedBuilder()
		.setAuthor({
			name: `${newMessage.author.tag} (${newMessage.author.id})`,
			icon_url: displayAvatarURL(newMessage.member ?? newMessage.author),
		})
		.setColor(me.displayColor)
		.setDescription(description)
		.setFields(
			{ name: "Channel", value: String(newMessage.channel), inline: true },
			{ name: "Message Link", value: hyperlink("Jump", newMessage.url), inline: true },
		)
		.setTimestamp()
		.setTitle("Message Updated");

	await messageLogWebhook.send({
		avatarURL: displayAvatarURL(me),
		embeds: [embed],
		username: me.displayName,
	});
}
