import process from "node:process";
import {
	type AttachmentBuilder,
	type AttachmentPayload,
	ChannelType,
	Client,
	type EmbedBuilder,
	Events,
	GatewayIntentBits,
	type GuildBasedChannel,
	type GuildChannelTypes,
	type MappedGuildChannelTypes,
	Options,
	Partials,
	PermissionFlagsBits,
	type Snowflake,
	type TextChannel,
	type ThreadChannel,
} from "discord.js";
import { Agent } from "undici";
import type { Event } from "./events/index.js";
import events from "./events/index.js";
import Friend, { type FriendPacket } from "./models/Friend.js";
import Ignore, { type IgnorePacket } from "./models/Ignore.js";
import { Report, type ReportsPacket } from "./models/Report.js";
import type { RequestPacket } from "./models/Request.js";
import Request from "./models/Request.js";
import pg, { Table } from "./pg.js";
import pino from "./pino.js";
import {
	DISCORD_TOKEN,
	GUILD_ID,
	QUEUE_LOG_CHANNEL_ID,
	QUICK_QUIZ_LOG_CHANNEL_ID,
	SOULOBBY_LOG_CHANNEL_ID,
} from "./utility/configuration.js";
import { LogType } from "./utility/functions.js";

interface LogOptions {
	content?: string;
	embeds?: EmbedBuilder[];
	error?: unknown;
	files?: (AttachmentPayload | AttachmentBuilder | string)[];
	type?: LogType;
}

declare module "discord.js" {
	interface Client {
		channel<T extends GuildChannelTypes>(id: Snowflake, type: T): MappedGuildChannelTypes[T];
		channel<T extends GuildChannelTypes>(
			id: Snowflake,
			type?: T,
		): Exclude<GuildBasedChannel, ThreadChannel>;
		get guild(): Guild;
		log(options: LogOptions | string): Promise<Message>;
	}
}

class Soulobby<Ready extends boolean = boolean> extends Client<Ready> {
	public override channel<T extends GuildChannelTypes>(
		id: Snowflake,
		type: T,
	): MappedGuildChannelTypes[T];

	public override channel<T extends GuildChannelTypes>(
		id: Snowflake,
		type?: T,
	): Exclude<GuildBasedChannel, ThreadChannel>;

	public override channel<T extends GuildChannelTypes>(id: Snowflake, type?: T) {
		const channel = this.guild.channels.cache.get(id);

		if (channel === undefined) {
			throw new Error(`Channel id ${id} was not in the cache.`);
		}

		if (type !== undefined && channel.type !== type) {
			throw new TypeError(
				`Channel "${channel.name}" is of type ${channel.type}, but expected type ${type}.`,
			);
		}

		return channel;
	}

	public override get guild() {
		const guild = this.guilds.cache.get(GUILD_ID);

		if (!guild) {
			throw new ReferenceError("Soulobby guild cannot be found.");
		}

		return guild;
	}

	public override async log(options: LogOptions | string) {
		const resolvedOptions = typeof options === "string" ? { content: options } : options;
		const { content, embeds = [], error, files = [], type } = resolvedOptions;
		let stamp = new Date().toISOString();
		const output = error || content;

		if (output) {
			pino.info(output);
		}

		let channel: TextChannel;

		switch (type) {
			case LogType.CorruptedEggQueue: {
				channel = this.channel(QUEUE_LOG_CHANNEL_ID, ChannelType.GuildText);
				break;
			}
			case LogType.QuickQuizLog: {
				channel = this.channel(QUICK_QUIZ_LOG_CHANNEL_ID, ChannelType.GuildText);
				break;
			}
			default: {
				channel = this.channel(SOULOBBY_LOG_CHANNEL_ID, ChannelType.GuildText);
				break;
			}
		}

		const me = await channel.guild.members.fetchMe();

		if (
			!channel
				.permissionsFor(me)
				.has(
					PermissionFlagsBits.AttachFiles |
						PermissionFlagsBits.EmbedLinks |
						PermissionFlagsBits.SendMessages |
						PermissionFlagsBits.ViewChannel,
				)
		) {
			throw new Error("Missing permissions to log.");
		}

		for (const embed of embeds) {
			if (embed.toJSON().color === undefined) {
				embed.setColor(me.displayColor);
			}
		}

		stamp = `\`[${stamp}]\``;

		const message = await channel.send({
			allowedMentions: { parse: [] },
			content: content ? `${stamp} ${content}` : undefined,
			embeds,
			files,
		});

		return message;
	}
}

async function collectFriends(client: Client) {
	for (const packet of await pg<FriendPacket>(Table.FriendsList).orderBy("id")) {
		const friend = new Friend(client, packet);
		Friend.cache.set(friend.id, friend);
	}
}

async function collectIgnores(client: Client) {
	for (const packet of await pg<IgnorePacket>(Table.IgnoreList).orderBy("id")) {
		const ignore = new Ignore(client, packet);
		Ignore.cache.set(ignore.id, ignore);
	}
}

async function collectReports() {
	for (const packet of await pg<ReportsPacket>(Table.Reports)) {
		const report = new Report(packet);
		Report.cache.set(report.userReportThreadId, report);
	}
}

async function collectRequests(client: Client) {
	for (const packet of await pg<RequestPacket>(Table.Requests).orderBy("id")) {
		const request = new Request(client, packet);
		Request.cache.set(request.id, request);
	}
}

const client = new Soulobby({
	intents:
		GatewayIntentBits.Guilds |
		GatewayIntentBits.GuildMembers |
		GatewayIntentBits.GuildModeration |
		GatewayIntentBits.GuildMessages |
		GatewayIntentBits.GuildMessageReactions |
		GatewayIntentBits.MessageContent |
		GatewayIntentBits.AutoModerationExecution,
	makeCache: Options.cacheWithLimits({
		GuildMemberManager: 500,
		UserManager: 500,
	}),
	partials: [Partials.GuildMember, Partials.Message],
	rest: {
		agent: new Agent(),
	},
});

for (const event of events) {
	const { name, once, fire }: Event = event;
	client[once ? "once" : "on"](name, fire);
}

client.on(Events.Error, (error) => pino.error(error));

try {
	await Promise.all([
		collectFriends(client),
		collectIgnores(client),
		collectReports(),
		collectRequests(client),
	]);
} catch (error) {
	pino.fatal(error, "Error collecting configurations from the database.");
	process.exit(1);
}

void client.login(DISCORD_TOKEN);
