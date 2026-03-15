import { ContainerBuilder, EmbedBuilder } from "@discordjs/builders";
import { formatEmoji, messageLink, TimestampStyles, userMention } from "@discordjs/formatters";
import {
	type ButtonInteraction,
	ChannelType,
	type Client,
	type Message as DiscordMessage,
	PermissionFlagsBits,
	type Snowflake,
} from "discord.js";
import { hiScore, profile } from "runescape";
import { Mixin } from "ts-mixer";
import { CALL_CACHE, updateCallCache } from "../caches/calls.js";
import pg, { Table } from "../pg.js";
import pino from "../pino.js";
import {
	CALLS_VIEW_CHANNEL_ID,
	CALLS_VIEW1_MESSAGE_ID,
	CORRUPTED_EGG_LOG_CHANNEL_ID,
	CORRUPTED_VIEW_CHANNEL_ID,
	CORRUPTED_VIEW1_MESSAGE_ID,
	GUILD_ID,
	QUEUE_CHAT_CHANNEL_ID,
	QUEUE_CHAT2_MESSAGE_ID,
} from "../utility/configuration.js";
import {
	CallType,
	CallTypeToString,
	CORRUPTED_EGG_SPAWN_LOCATION_IMPERIAL,
	CORRUPTED_EGG_SPAWN_LOCATION_MERCHANT,
	CORRUPTED_EGG_SPAWN_LOCATION_NORTHERN_SOPHANEM,
	CORRUPTED_EGG_SPAWN_LOCATION_PORT,
	CORRUPTED_EGG_SPAWN_LOCATION_SOUTHERN_SOPHANEM,
	CORRUPTED_EGG_SPAWN_LOCATION_WORKERS,
	CORRUPTED_EGG_VIEW_SYMBOL,
	CORRUPTED_SCARABS_VIEW_SYMBOL,
	DAILY_CAT_SPAWN_LOCATION_EASTERN_MERCHANT,
	DAILY_CAT_SPAWN_LOCATION_EASTERN_PORT,
	DAILY_CAT_SPAWN_LOCATION_IMPERIAL,
	DAILY_CAT_SPAWN_LOCATION_WESTERN_MERCHANT,
	DAILY_CAT_SPAWN_LOCATION_WESTERN_PORT,
	DAILY_CAT_SPAWN_LOCATION_WORKERS,
	P2P_ENGLISH_SERVERS,
	P2P_SERVERS,
	type P2PEnglishServers,
	SOUL_OBELISK_SPAWN_LOCATION_IMPERIAL,
	SOUL_OBELISK_SPAWN_LOCATION_MERCHANT,
	SOUL_OBELISK_SPAWN_LOCATION_PORT,
	SOUL_OBELISK_SPAWN_LOCATION_WORKERS,
	SOUL_OBELISK_VIEW_SYMBOL,
} from "../utility/constants.js";
import { EMOJIS } from "../utility/emojis.js";
import { isP2PEnglishServer, time } from "../utility/functions.js";

enum CallLocation {
	Merchant = 0,
	EasternMerchant = 1,
	WesternMerchant = 2,
	Imperial = 3,
	Worker = 4,
	Port = 5,
	EasternPort = 6,
	WesternPort = 7,
	SouthernSophanem = 8,
	NorthernSophanem = 9,
}

export const CallLocationToString = {
	[CallLocation.Merchant]: "Merchant",
	[CallLocation.EasternMerchant]: "Eastern Merchant",
	[CallLocation.WesternMerchant]: "Western Merchant",
	[CallLocation.Imperial]: "Imperial",
	[CallLocation.Worker]: "Worker",
	[CallLocation.Port]: "Port",
	[CallLocation.EasternPort]: "Eastern Port",
	[CallLocation.WesternPort]: "Western Port",
	[CallLocation.SouthernSophanem]: "Southern Sophanem",
	[CallLocation.NorthernSophanem]: "Northern Sophanem",
} as const satisfies Readonly<Record<CallLocation, string>>;

const SOUL_OBELISK_CALL_LOCATIONS = [
	CallLocation.Merchant,
	CallLocation.Imperial,
	CallLocation.Worker,
	CallLocation.Port,
] as const satisfies Readonly<CallLocation[]>;

type SoulObeliskCallLocation = (typeof SOUL_OBELISK_CALL_LOCATIONS)[number];

const SoulObeliskCallLocationToImage = {
	[CallLocation.Merchant]: SOUL_OBELISK_SPAWN_LOCATION_MERCHANT,
	[CallLocation.Imperial]: SOUL_OBELISK_SPAWN_LOCATION_IMPERIAL,
	[CallLocation.Worker]: SOUL_OBELISK_SPAWN_LOCATION_WORKERS,
	[CallLocation.Port]: SOUL_OBELISK_SPAWN_LOCATION_PORT,
} as const satisfies Readonly<Record<SoulObeliskCallLocation, string>>;

const DAILY_CAT_CALL_LOCATIONS = [
	CallLocation.EasternMerchant,
	CallLocation.WesternMerchant,
	CallLocation.Imperial,
	CallLocation.Worker,
	CallLocation.EasternPort,
	CallLocation.WesternPort,
] as const satisfies Readonly<CallLocation[]>;

type DailyCatCallLocation = (typeof DAILY_CAT_CALL_LOCATIONS)[number];

const DailyCatCallLocationToImage = {
	[CallLocation.EasternMerchant]: DAILY_CAT_SPAWN_LOCATION_EASTERN_MERCHANT,
	[CallLocation.WesternMerchant]: DAILY_CAT_SPAWN_LOCATION_WESTERN_MERCHANT,
	[CallLocation.Imperial]: DAILY_CAT_SPAWN_LOCATION_IMPERIAL,
	[CallLocation.Worker]: DAILY_CAT_SPAWN_LOCATION_WORKERS,
	[CallLocation.EasternPort]: DAILY_CAT_SPAWN_LOCATION_EASTERN_PORT,
	[CallLocation.WesternPort]: DAILY_CAT_SPAWN_LOCATION_WESTERN_PORT,
} as const satisfies Readonly<Record<DailyCatCallLocation, string>>;

export const CORRUPTED_EGG_CALL_LOCATIONS = [
	CallLocation.Merchant,
	CallLocation.Imperial,
	CallLocation.Worker,
	CallLocation.Port,
	CallLocation.SouthernSophanem,
	CallLocation.NorthernSophanem,
] as const satisfies Readonly<CallLocation[]>;

export type CorruptedEggCallLocation = (typeof CORRUPTED_EGG_CALL_LOCATIONS)[number];

const CorruptedEggCallLocationToImage = {
	[CallLocation.Merchant]: CORRUPTED_EGG_SPAWN_LOCATION_MERCHANT,
	[CallLocation.Imperial]: CORRUPTED_EGG_SPAWN_LOCATION_IMPERIAL,
	[CallLocation.Worker]: CORRUPTED_EGG_SPAWN_LOCATION_WORKERS,
	[CallLocation.Port]: CORRUPTED_EGG_SPAWN_LOCATION_PORT,
	[CallLocation.SouthernSophanem]: CORRUPTED_EGG_SPAWN_LOCATION_SOUTHERN_SOPHANEM,
	[CallLocation.NorthernSophanem]: CORRUPTED_EGG_SPAWN_LOCATION_NORTHERN_SOPHANEM,
} as const satisfies Readonly<Record<CorruptedEggCallLocation, string>>;

const SOUL_OBELISK_CALL_LOCATION_STRINGS = ["m", "i", "w", "p"] as const satisfies Readonly<
	string[]
>;

type SoulObeliskCallLocationString = (typeof SOUL_OBELISK_CALL_LOCATION_STRINGS)[number];

const SoulObeliskCallStringToCallLocation = {
	m: CallLocation.Merchant,
	i: CallLocation.Imperial,
	w: CallLocation.Worker,
	p: CallLocation.Port,
} as const satisfies Readonly<Record<SoulObeliskCallLocationString, CallLocation>>;

const DAILY_CAT_CALL_LOCATION_STRINGS = [
	"e m",
	"w m",
	"i",
	"w",
	"e p",
	"w p",
] as const satisfies Readonly<string[]>;

type DailyCatCallLocationString = (typeof DAILY_CAT_CALL_LOCATION_STRINGS)[number];

const DailyCatCallStringToCallLocation = {
	"e m": CallLocation.EasternMerchant,
	"w m": CallLocation.WesternMerchant,
	i: CallLocation.Imperial,
	w: CallLocation.Worker,
	"e p": CallLocation.EasternPort,
	"w p": CallLocation.WesternPort,
} as const satisfies Readonly<Record<DailyCatCallLocationString, CallLocation>>;

const CORRUPTED_EGG_CALL_LOCATION_STRINGS = [
	"m",
	"i",
	"w",
	"p",
	"s s",
	"n s",
] as const satisfies Readonly<string[]>;

type CorruptedEggCallLocationString = (typeof CORRUPTED_EGG_CALL_LOCATION_STRINGS)[number];

const CorruptedEggCallStringToCallLocation = {
	m: CallLocation.Merchant,
	i: CallLocation.Imperial,
	w: CallLocation.Worker,
	p: CallLocation.Port,
	"s s": CallLocation.SouthernSophanem,
	"n s": CallLocation.NorthernSophanem,
} as const satisfies Readonly<Record<CorruptedEggCallLocationString, CallLocation>>;

enum CallState {
	UnknownAge = 0,
	Fresh = 1,
}

type CallStateString = "ua" | "f";

const CallStringToCallState = {
	ua: CallState.UnknownAge,
	f: CallState.Fresh,
} as const satisfies Readonly<Record<CallStateString, CallState>>;

const SOUL_OBELISK_CALL_REGULAR_EXPRESSION = new RegExp(
	`^(?<world>${P2P_ENGLISH_SERVERS.join("|")}) (?<location>${SOUL_OBELISK_CALL_LOCATION_STRINGS.join("|")})(?: (?<state>ua|f))?$`,
	"i",
);

const SOUL_OBELISK_LOOKUP_REGULAR_EXPRESSION = new RegExp(
	`\\[(?<world>${P2P_ENGLISH_SERVERS.join("|")}) (?<location>${SOUL_OBELISK_CALL_LOCATION_STRINGS.join("|")})(?: (?<state>ua|f))?\\]`,
	"i",
);

const CORRUPTED_SCARABS_CALL_REGULAR_EXPRESSION = new RegExp(
	`^(?<world>${P2P_ENGLISH_SERVERS.join("|")}) s(?: (?<state>ua|f))?$`,
	"i",
);

const CORRUPTED_SCARABS_LOOKUP_REGULAR_EXPRESSION = new RegExp(
	`\\[(?<world>${P2P_ENGLISH_SERVERS.join("|")}) s(?: (?<state>ua|f))?\\]`,
	"i",
);

const DAILY_CAT_CALL_REGULAR_EXPRESSION = new RegExp(
	`^(?<world>${P2P_ENGLISH_SERVERS.join("|")}) d (?<location>${DAILY_CAT_CALL_LOCATION_STRINGS.join("|")})$`,
	"i",
);

const DAILY_CAT_LOOKUP_REGULAR_EXPRESSION = new RegExp(
	`\\[(?<world>${P2P_ENGLISH_SERVERS.join("|")}) d (?<location>${DAILY_CAT_CALL_LOCATION_STRINGS.join("|")})\\]`,
	"i",
);

const CORRUPTED_EGG_CALL_REGULAR_EXPRESSION = new RegExp(
	`^(?<world>${P2P_SERVERS.join("|")}) c (?<location>${CORRUPTED_EGG_CALL_LOCATION_STRINGS.join("|")})(?: (?<playerName>([\\w -]{0,12}(?<![ _-]))))?$`,
	"i",
);

const CORRUPTED_EGG_LOOKUP_REGULAR_EXPRESSION = new RegExp(
	`\\[(?<world>${P2P_SERVERS.join("|")}) c (?<location>${CORRUPTED_EGG_CALL_LOCATION_STRINGS.join("|")})\\]`,
	"i",
);

interface BaseLocationData {
	location: CallLocation;
}

interface BaseCallStateData {
	state: CallState;
}

interface SoulObeliskLocationData extends BaseLocationData {
	location: SoulObeliskCallLocation;
}

interface DailyCatLocationData extends BaseLocationData {
	location: DailyCatCallLocation;
}

interface CorruptedEggLocationData extends BaseLocationData {
	location: CorruptedEggCallLocation;
}

interface BaseCallData {
	world: (typeof P2P_SERVERS)[number];
	lookup?: boolean;
}

interface SoulObeliskCallData extends BaseCallData, SoulObeliskLocationData, BaseCallStateData {
	world: P2PEnglishServers;
}

interface CorruptedScarabsCallData extends BaseCallData, BaseCallStateData {
	world: P2PEnglishServers;
}

interface DailyCatCallData extends BaseCallData, DailyCatLocationData {
	world: P2PEnglishServers;
}

interface CorruptedEggCallData extends BaseCallData, CorruptedEggLocationData {
	playerName?: string | null | undefined;
}

abstract class BaseLocation {
	public readonly location: CallLocation;

	public constructor(data: BaseLocationData) {
		this.location = data.location;
	}
}

abstract class SoulObeliskLocation extends BaseLocation {
	public declare location: SoulObeliskCallLocation;

	public readonly locationImage: string;

	public constructor(data: SoulObeliskLocationData) {
		super(data);
		this.locationImage = SoulObeliskCallLocationToImage[this.location];
	}
}

abstract class DailyCatLocation extends BaseLocation {
	public declare location: DailyCatCallLocation;

	public readonly locationImage: string;

	public constructor(data: DailyCatLocationData) {
		super(data);
		this.locationImage = DailyCatCallLocationToImage[this.location];
	}
}

abstract class CorruptedEggLocation extends BaseLocation {
	public declare location: CorruptedEggCallLocation;

	public readonly locationImage: string;

	public constructor(data: CorruptedEggLocationData) {
		super(data);
		this.locationImage = CorruptedEggCallLocationToImage[this.location];
	}
}

abstract class BaseState {
	public readonly state: CallState;

	public constructor(data: BaseCallStateData) {
		this.state = data.state;
	}
}

abstract class BaseCall {
	public readonly world: (typeof P2P_SERVERS)[number];

	public readonly type!: CallType;

	public readonly lookup: boolean;

	public constructor(
		data:
			| SoulObeliskCallData
			| CorruptedScarabsCallData
			| DailyCatCallData
			| CorruptedScarabsCallData,
	) {
		this.world = data.world;
		this.lookup = data.lookup ?? false;
	}
}

export class SoulObeliskCall extends Mixin(BaseCall, SoulObeliskLocation, BaseState) {
	public declare readonly world: P2PEnglishServers;

	public override readonly type = CallType.SoulObelisk;

	public readonly typeEmoji = EMOJIS.SoulObelisk;

	public messageId: Snowflake | null = null;

	public createdTimestamp: number | null = null;

	public expiresTimestamp: number | null = null;

	public loggedTimeout: NodeJS.Timeout | null = null;

	public reactTimeout: NodeJS.Timeout | null = null;

	public async handle(message: DiscordMessage<true>, updateView = true) {
		const existingCall = CALL_CACHE.get(this.world)![this.type];

		if (existingCall) {
			await message
				.delete()
				.catch((error) => pino.error(error, "Failed to delete an existing soul obelisk call."));

			return;
		}

		const { createdTimestamp } = message;
		this.createdTimestamp = createdTimestamp;
		const expiresTimestamp =
			createdTimestamp + (this.state === CallState.Fresh ? 450_000 : 420_000);
		this.expiresTimestamp = expiresTimestamp;
		const loggedExpiresTimestamp = createdTimestamp + 1_800_000 - Date.now();

		if (this.loggedTimeout) {
			clearTimeout(this.loggedTimeout);
			this.loggedTimeout = null;
		}

		if (loggedExpiresTimestamp > 0) {
			this.loggedTimeout = setTimeout(async () => {
				updateCallCache(this.world, { [this.type]: null });

				if (this.loggedTimeout) {
					clearTimeout(this.loggedTimeout);
					this.loggedTimeout = null;
				}

				await updateCallsView(message.client);
			}, loggedExpiresTimestamp);

			updateCallCache(this.world, { [this.type]: this });
		}

		if (this.reactTimeout) {
			clearTimeout(this.reactTimeout);
			this.reactTimeout = null;
		}

		this.reactTimeout = setTimeout(async () => {
			await message.react("❌").catch(() => null);

			if (this.reactTimeout) {
				clearTimeout(this.reactTimeout);
				this.reactTimeout = null;
			}
		}, expiresTimestamp - Date.now());

		this.messageId = message.id;
		const promises = [];
		promises.push(message.react(EMOJIS.SoulObelisk.id));

		if (updateView) {
			promises.push(updateCallsView(message.client));
		}

		await Promise.all(promises);
	}
}

export class CorruptedScarabsCall extends Mixin(BaseCall, BaseState) {
	public declare readonly world: P2PEnglishServers;

	public override readonly type = CallType.CorruptedScarabs;

	public messageId: Snowflake | null = null;

	public createdTimestamp: number | null = null;

	public expiresTimestamp: number | null = null;

	public loggedTimeout: NodeJS.Timeout | null = null;

	public reactTimeout: NodeJS.Timeout | null = null;

	public async handle(message: DiscordMessage<true>, updateView = true) {
		const existingCall = CALL_CACHE.get(this.world)![this.type];

		if (existingCall) {
			await message
				.delete()
				.catch((error) =>
					pino.error(error, "Failed to delete an existing corrupted scarabs call."),
				);

			return;
		}

		const { createdTimestamp } = message;
		this.createdTimestamp = createdTimestamp;
		const expiresTimestamp =
			createdTimestamp + (this.state === CallState.Fresh ? 300_000 : 270_000);
		this.expiresTimestamp = expiresTimestamp;
		const loggedExpiresTimestamp = createdTimestamp + 1_800_000 - Date.now();

		if (this.loggedTimeout) {
			clearTimeout(this.loggedTimeout);
			this.loggedTimeout = null;
		}

		if (loggedExpiresTimestamp > 0) {
			this.loggedTimeout = setTimeout(async () => {
				updateCallCache(this.world, { [this.type]: null });

				if (this.loggedTimeout) {
					clearTimeout(this.loggedTimeout);
					this.loggedTimeout = null;
				}

				await updateCallsView(message.client);
			}, loggedExpiresTimestamp);

			updateCallCache(this.world, { [this.type]: this });
		}

		if (this.reactTimeout) {
			clearTimeout(this.reactTimeout);
			this.reactTimeout = null;
		}

		this.reactTimeout = setTimeout(async () => {
			await message.react("❌").catch(() => null);

			if (this.reactTimeout) {
				clearTimeout(this.reactTimeout);
				this.reactTimeout = null;
			}
		}, expiresTimestamp - Date.now());

		this.messageId = message.id;
		const promises = [];
		promises.push(message.react(EMOJIS.Scarabs.id));

		if (updateView) {
			promises.push(updateCallsView(message.client));
		}

		await Promise.all(promises);
	}
}

export class DailyCatCall extends Mixin(BaseCall, DailyCatLocation) {
	public declare readonly world: P2PEnglishServers;

	public override readonly type = CallType.DailyCat;

	public readonly typeEmoji = EMOJIS.PurrnOfPreviousPostcat;
}

export interface CorruptedEggPacket {
	id: number;
	user_id: Snowflake;
	logged_for: string | null;
	world: number;
	location: CorruptedEggCallLocation;
	timestamp: Date;
	message_id: Snowflake | null;
}

export class CorruptedEggCall extends Mixin(BaseCall, CorruptedEggLocation) {
	public override readonly type = CallType.CorruptedEgg;

	public readonly typeEmoji = EMOJIS.CorruptedEgg;

	public readonly playerName: string | null;

	public static corruptedEggLogViewTimeout: NodeJS.Timeout | null = null;

	public loggedTimeout: NodeJS.Timeout | null = null;

	public constructor(data: CorruptedEggCallData) {
		super(data);
		this.playerName = data.playerName ?? null;
	}

	public handle(client: Client, timestamp: number) {
		if (this.loggedTimeout) {
			clearTimeout(this.loggedTimeout);
			this.loggedTimeout = null;
		}

		this.loggedTimeout = setTimeout(
			async () => {
				updateCallCache(this.world, { [this.type]: null });

				if (this.loggedTimeout) {
					clearTimeout(this.loggedTimeout);
					this.loggedTimeout = null;
				}

				await updateCorruptedView(client);
			},
			50_400_000 - (Date.now() - timestamp),
		);

		updateCallCache(this.world, { [this.type]: this });
	}

	public async createLog(message: DiscordMessage<true>) {
		const existingCall = CALL_CACHE.get(this.world)![this.type];

		if (existingCall) {
			await message.reply({
				allowedMentions: { repliedUser: false },
				content: "That corrupted egg has recently been logged already.",
				failIfNotExists: false,
			});

			return;
		}

		let { playerName } = this;

		if (playerName !== null) {
			// Attempt to correct the stylisation.
			const data =
				(await profile({ name: playerName, activities: 0 }).catch(() => null)) ??
				(await hiScore({ name: playerName }).catch(() => null));

			if (!data) {
				// They don't appear to have a public RuneMetrics profile and they are not on HiScores.
				// There is a great possibility that this account may not exist.
				await message.reply({
					allowedMentions: { repliedUser: false },
					content: "Cannot interpret the provided RSN.",
					failIfNotExists: false,
				});

				return;
			}

			if ("name" in data) {
				playerName = data.name;
			}
		}

		const [packet] = await pg<CorruptedEggPacket>(Table.CorruptedEggs).insert(
			{
				user_id: message.author.id,
				world: this.world,
				location: this.location,
				timestamp: new Date(),
				logged_for: playerName,
			},
			"*",
		);

		await updateCorruptedEggLogView(message.client, packet.timestamp.getTime());

		const { id: messageId } = await message.client
			.channel(CORRUPTED_EGG_LOG_CHANNEL_ID, ChannelType.GuildText)
			.send({ embeds: [await CorruptedEggCall.embed(message.client, packet)] });

		await pg<CorruptedEggPacket>(Table.CorruptedEggs)
			.update({ message_id: messageId })
			.where({ id: packet.id })
			.returning("*");

		this.handle(message.client, packet.timestamp.getTime());

		await Promise.all([
			message.react(EMOJIS.CorruptedEgg.id),
			updateCorruptedView(message.client),
			updateCorruptedEggStats(message.client),
		]);
	}

	public static async edit(interaction: ButtonInteraction<"cached">, data: CorruptedEggPacket) {
		await pg<CorruptedEggPacket>(Table.CorruptedEggs)
			.update({
				world: data.world,
				location: data.location,
				logged_for: data.logged_for,
			})
			.where({ id: data.id });

		if (data.message_id) {
			await interaction.client
				.channel(CORRUPTED_EGG_LOG_CHANNEL_ID, ChannelType.GuildText)
				.messages.edit(data.message_id, {
					embeds: [await CorruptedEggCall.embed(interaction.client, data)],
				});
		}

		await interaction.editReply({
			components: [],
			content: `${interaction.user} has successfully edited this corrupted egg.${
				data.message_id ? "" : " Note that there was no embed to edit."
			}`,
			embeds: [await CorruptedEggCall.embed(interaction.client, data, true)],
		});

		await updateCorruptedEggStats(interaction.client);
	}

	public async update(
		client: Client<true>,
		data: CorruptedEggPacket & { world: (typeof P2P_SERVERS)[number] },
	) {
		if (this.loggedTimeout) {
			clearTimeout(this.loggedTimeout);
			this.loggedTimeout = null;
		}

		updateCallCache(this.world, { [this.type]: null });

		const call = new CorruptedEggCall({
			world: data.world,
			location: data.location,
			playerName: data.logged_for,
		});

		call.handle(client, data.timestamp.getTime());
		await updateCorruptedView(client);
	}

	public static async embed(
		client: Client<true>,
		{ id, user_id, logged_for, world, location, timestamp, message_id }: CorruptedEggPacket,
		link = false,
	) {
		const embed = new EmbedBuilder()
			.setColor((await client.guild.members.fetchMe()).displayColor)
			.setDescription(
				`${formatEmoji(EMOJIS.CorruptedEgg)} A ${
					link && message_id
						? `[corrupted egg](${messageLink(CORRUPTED_EGG_LOG_CHANNEL_ID, message_id, GUILD_ID)})`
						: "corrupted egg"
				} has been found by ${logged_for === null ? userMention(user_id) : `\`${logged_for}\``}!`,
			)
			.setFields(
				{ name: "World", value: String(world), inline: true },
				{ name: "Location", value: CallLocationToString[location], inline: true },
				{
					name: "Date",
					value: time(timestamp.getTime(), TimestampStyles.FullDateShortTime),
					inline: true,
				},
			)
			.setFooter({ text: `#${id}` });

		if (logged_for !== null) {
			embed.addFields({ name: "Logged By", value: userMention(user_id), inline: true });
		}

		return embed;
	}
}

export function createCallFromMessage(message: string) {
	const sOCRegExp = SOUL_OBELISK_CALL_REGULAR_EXPRESSION.exec(message);
	const sOLRegExp = SOUL_OBELISK_LOOKUP_REGULAR_EXPRESSION.exec(message);
	const sORegExp = sOCRegExp ?? sOLRegExp;

	if (sORegExp?.groups) {
		const { world, location, state } = sORegExp.groups as {
			world: `${P2PEnglishServers}`;
			location: SoulObeliskCallLocationString;
			state: CallStateString | undefined;
		};

		const fromRawCall = new SoulObeliskCall({
			world: Number(world) as P2PEnglishServers,
			location: SoulObeliskCallStringToCallLocation[location],
			state: state ? CallStringToCallState[state] : CallState.UnknownAge,
			lookup: sOLRegExp !== null,
		});

		return fromRawCall;
	}

	const cSCRegExp = CORRUPTED_SCARABS_CALL_REGULAR_EXPRESSION.exec(message);
	const cSLRegExp = CORRUPTED_SCARABS_LOOKUP_REGULAR_EXPRESSION.exec(message);
	const cSRegExp = cSCRegExp ?? cSLRegExp;

	if (cSRegExp?.groups) {
		const { world, state } = cSRegExp.groups as {
			world: `${P2PEnglishServers}`;
			state: CallStateString | undefined;
		};

		const fromRawCall = new CorruptedScarabsCall({
			world: Number(world) as P2PEnglishServers,
			state: state ? CallStringToCallState[state] : CallState.UnknownAge,
			lookup: cSLRegExp !== null,
		});

		return fromRawCall;
	}

	const dCCRegExp = DAILY_CAT_CALL_REGULAR_EXPRESSION.exec(message);
	const dCLRegExp = DAILY_CAT_LOOKUP_REGULAR_EXPRESSION.exec(message);
	const dCRegExp = dCCRegExp ?? dCLRegExp;

	if (dCRegExp?.groups) {
		const { world, location } = dCRegExp.groups as {
			world: `${P2PEnglishServers}`;
			location: DailyCatCallLocationString;
		};

		const fromRawCall = new DailyCatCall({
			world: Number(world) as P2PEnglishServers,
			location: DailyCatCallStringToCallLocation[location],
			lookup: dCLRegExp !== null,
		});

		return fromRawCall;
	}

	const cECRegExp = CORRUPTED_EGG_CALL_REGULAR_EXPRESSION.exec(message);
	const cELRegExp = CORRUPTED_EGG_LOOKUP_REGULAR_EXPRESSION.exec(message);
	const cERegExp = cECRegExp ?? cELRegExp;

	if (cERegExp?.groups) {
		const { world, location, playerName } = cERegExp.groups as {
			world: `${(typeof P2P_SERVERS)[number]}`;
			location: CorruptedEggCallLocationString;
			playerName?: string | undefined;
		};

		const fromRawCall = new CorruptedEggCall({
			world: Number(world) as (typeof P2P_SERVERS)[number],
			location: CorruptedEggCallStringToCallLocation[location],
			playerName,
			lookup: cELRegExp !== null,
		});

		return fromRawCall;
	}

	return null;
}

export async function deleteCall(call: SoulObeliskCall | CorruptedScarabsCall, client: Client) {
	if (call.loggedTimeout) {
		clearTimeout(call.loggedTimeout);
		call.loggedTimeout = null;
	}

	if (call.reactTimeout) {
		clearTimeout(call.reactTimeout);
		call.reactTimeout = null;
	}

	updateCallCache(call.world, { [call.type]: null });
	await updateCallsView(client);
}

export async function updateCall(
	call: SoulObeliskCall | CorruptedScarabsCall,
	message: DiscordMessage<true>,
) {
	const newCall = createCallFromMessage(message.content);

	// Only allow valid calls to be updated.
	if (
		!newCall ||
		(newCall.type !== CallType.SoulObelisk && newCall.type !== CallType.CorruptedScarabs)
	) {
		// The message was edited to no longer be a call. Delete it.
		await message
			.delete()
			.catch((error) => pino.error(error, "Failed to delete a now-invalid call."));

		return;
	}

	if (call.loggedTimeout) {
		clearTimeout(call.loggedTimeout);
		call.loggedTimeout = null;
	}

	if (call.reactTimeout) {
		clearTimeout(call.reactTimeout);
		call.reactTimeout = null;
	}

	if (call.type !== newCall.type) {
		await message.reactions
			.removeAll()
			.catch((error) =>
				pino.error(error, "Failed to remove all reactions when swapping call types."),
			);
	}

	updateCallCache(call.world, { [call.type]: null });
	await newCall.handle(message, true);
}

export async function updateCallsView(client: Client) {
	const worlds: string[] = [];

	for (const [world, callCacheData] of CALL_CACHE) {
		if (isP2PEnglishServer(Number(world))) {
			worlds.push(
				`${String(world).padEnd(4)}${callCacheData[CallType.SoulObelisk] ? SOUL_OBELISK_VIEW_SYMBOL : " "}${
					callCacheData[CallType.CorruptedScarabs] ? CORRUPTED_SCARABS_VIEW_SYMBOL : " "
				}`,
			);
		}
	}

	const message: string[] = [];

	for (let index = 0, maxIndex = 24; index < maxIndex; index++) {
		message.push(
			`${(worlds[index] ?? "").padEnd(10)}${(worlds[index + maxIndex] ?? "").padEnd(10)}${(worlds[index + maxIndex * 2] ?? "").padEnd(10)}${(worlds[index + maxIndex * 3] ?? "").padEnd(6)}`,
		);
	}

	const embed = new EmbedBuilder()
		.setColor((await client.guild.members.fetchMe()).displayColor)
		.setDescription(
			`Soul obelisk: \`${SOUL_OBELISK_VIEW_SYMBOL}\`\nCorrupted scarabs: \`${CORRUPTED_SCARABS_VIEW_SYMBOL}\`\n\`\`\`Markdown\n${message.join("\n")}\n\`\`\``,
		)
		.setFooter({ text: "Last updated" })
		.setTimestamp();

	await client
		.channel(CALLS_VIEW_CHANNEL_ID, ChannelType.GuildText)
		.messages.edit(CALLS_VIEW1_MESSAGE_ID, { embeds: [embed] });
}

export async function updateCorruptedEggLogView(client: Client, timestamp: number) {
	const corruptedEggLog = client.channel(CORRUPTED_EGG_LOG_CHANNEL_ID, ChannelType.GuildText);

	if (
		!corruptedEggLog.permissionOverwrites.cache
			.get(client.guild.roles.everyone.id)
			?.deny.has(PermissionFlagsBits.ViewChannel)
	) {
		await corruptedEggLog.permissionOverwrites.edit(client.guild.roles.everyone.id, {
			ViewChannel: false,
		});
	}

	if (CorruptedEggCall.corruptedEggLogViewTimeout) {
		clearTimeout(CorruptedEggCall.corruptedEggLogViewTimeout);
		CorruptedEggCall.corruptedEggLogViewTimeout = null;
	}

	CorruptedEggCall.corruptedEggLogViewTimeout = setTimeout(
		async () => {
			await corruptedEggLog.permissionOverwrites.edit(client.guild.roles.everyone.id, {
				ViewChannel: null,
			});

			if (CorruptedEggCall.corruptedEggLogViewTimeout !== null) {
				clearTimeout(CorruptedEggCall.corruptedEggLogViewTimeout);
				CorruptedEggCall.corruptedEggLogViewTimeout = null;
			}
		},
		3_600_000 - (Date.now() - timestamp),
	);
}

export async function updateCorruptedView(client: Client) {
	const worlds = CALL_CACHE.entries().reduce<string[]>((worlds, [world, callCacheData]) => {
		worlds.push(
			`${String(world).padEnd(4)}${callCacheData[CallType.CorruptedEgg] ? CORRUPTED_EGG_VIEW_SYMBOL : " "}`,
		);

		return worlds;
	}, []);

	const message: string[] = [];

	for (let No = 0, maxNo = 23; No < maxNo; No++) {
		message.push(
			`${(worlds[No] ?? "").padEnd(10)}${(worlds[No + maxNo] ?? "").padEnd(10)}${(worlds[No + maxNo * 2] ?? "").padEnd(10)}${(worlds[No + maxNo * 3] ?? "").padEnd(10)}${(worlds[No + maxNo * 4] ?? "").padEnd(5)}`,
		);
	}

	const embed = new EmbedBuilder()
		.setColor((await client.guild.members.fetchMe()).displayColor)
		.setDescription(
			`${worlds.filter((world) => world.endsWith(CORRUPTED_EGG_VIEW_SYMBOL)).length}/${
				worlds.length
			}\`\`\`Markdown\n${message.join("\n")}\n\`\`\``,
		)
		.setFooter({ text: "Last updated" })
		.setTimestamp();

	await client
		.channel(CORRUPTED_VIEW_CHANNEL_ID, ChannelType.GuildText)
		.messages.edit(CORRUPTED_VIEW1_MESSAGE_ID, { embeds: [embed] });
}

async function updateCorruptedEggStats(client: Client<true>) {
	const minimumTimestamps: Record<number, { currentTimestamp: number; timestamps: number[] }> = {};

	let total = 0;
	let merchant = 0;
	let imperial = 0;
	let worker = 0;
	let port = 0;
	let southernSophanem = 0;
	let northernSophanem = 0;
	let monday = 0;
	let tuesday = 0;
	let wednesday = 0;
	let thursday = 0;
	let friday = 0;
	let saturday = 0;
	let sunday = 0;

	for (const packet of await pg<CorruptedEggPacket>(Table.CorruptedEggs).orderBy("id")) {
		total++;

		if (minimumTimestamps[packet.world] === undefined) {
			minimumTimestamps[packet.world] = {
				currentTimestamp: packet.timestamp.getTime(),
				timestamps: [],
			};
		} else {
			minimumTimestamps[packet.world].timestamps.push(
				packet.timestamp.getTime() - minimumTimestamps[packet.world].currentTimestamp,
			);

			minimumTimestamps[packet.world].currentTimestamp = packet.timestamp.getTime();
		}

		switch (packet.location) {
			case CallLocation.Merchant: {
				merchant++;
				break;
			}
			case CallLocation.Imperial: {
				imperial++;
				break;
			}
			case CallLocation.Worker: {
				worker++;
				break;
			}
			case CallLocation.Port: {
				port++;
				break;
			}
			case CallLocation.SouthernSophanem: {
				southernSophanem++;
				break;
			}
			case CallLocation.NorthernSophanem: {
				northernSophanem++;
				break;
			}
		}

		switch (packet.timestamp.getUTCDay()) {
			case 1: {
				monday++;
				break;
			}
			case 2: {
				tuesday++;
				break;
			}
			case 3: {
				wednesday++;
				break;
			}
			case 4: {
				thursday++;
				break;
			}
			case 5: {
				friday++;
				break;
			}
			case 6: {
				saturday++;
				break;
			}
			case 0: {
				sunday++;
				break;
			}
		}
	}

	const computedMinimumTimestamps = Object.values(minimumTimestamps).flatMap(
		({ timestamps }) => timestamps,
	);

	const embed = new EmbedBuilder()
		.setColor((await client.guild.members.fetchMe()).displayColor)
		.setFields(
			{
				name: CallLocationToString[CallLocation.Merchant],
				value: String(merchant),
				inline: true,
			},
			{
				name: CallLocationToString[CallLocation.Imperial],
				value: String(imperial),
				inline: true,
			},
			{
				name: CallLocationToString[CallLocation.SouthernSophanem],
				value: String(southernSophanem),
				inline: true,
			},
			{ name: CallLocationToString[CallLocation.Worker], value: String(worker), inline: true },
			{ name: CallLocationToString[CallLocation.Port], value: String(port), inline: true },
			{
				name: CallLocationToString[CallLocation.NorthernSophanem],
				value: String(northernSophanem),
				inline: true,
			},
			{ name: "Monday", value: String(monday), inline: true },
			{ name: "Tuesday", value: String(tuesday), inline: true },
			{ name: "Wednesday", value: String(wednesday), inline: true },
			{ name: "Thursday", value: String(thursday), inline: true },
			{ name: "Friday", value: String(friday), inline: true },
			{ name: "Saturday", value: String(saturday), inline: true },
			{ name: "Sunday", value: String(sunday), inline: true },
			{
				name: "Minimum time",
				value:
					computedMinimumTimestamps.length === 0
						? "??"
						: String(Math.min(...computedMinimumTimestamps)),
				inline: true,
			},
			{ name: "Total", value: String(total), inline: true },
		)
		.setFooter({ text: "Last updated" })
		.setTimestamp()
		.setTitle("Corrupted Egg Statistics");

	await client
		.channel(QUEUE_CHAT_CHANNEL_ID, ChannelType.GuildText)
		.messages.edit(QUEUE_CHAT2_MESSAGE_ID, { embeds: [embed] });
}

export function lookupComponents({
	world,
	type,
	typeEmoji,
	location,
	locationImage,
}: DailyCatCall | SoulObeliskCall | CorruptedEggCall) {
	return new ContainerBuilder()
		.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`World ${world} ${CallLocationToString[location]}${location === CallLocation.SouthernSophanem || location === CallLocation.NorthernSophanem ? "" : " District"}`,
			),
		)
		.addMediaGalleryComponents((mediaGallery) =>
			mediaGallery.addItems((mediaGalleryItem) => mediaGalleryItem.setURL(locationImage)),
		)
		.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`-# ${formatEmoji(typeEmoji)} ${CallTypeToString[type]} spawn location`,
			),
		);
}
