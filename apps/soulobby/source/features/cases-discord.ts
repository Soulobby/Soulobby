import { channelMention, TimestampStyles, time, userMention } from "@discordjs/formatters";
import {
	type AutoModerationActionExecution,
	AutoModerationActionType,
	AutoModerationRuleTriggerType,
	ChannelType,
	type Client,
	type Guild,
	type PublicThreadChannel,
	type Snowflake,
	type User,
} from "discord.js";
import pg, { Table } from "../pg.js";
import { DISCORD_CASES_CHANNEL_ID } from "../utility/configuration.js";
import {
	BAN_COLOUR,
	COMMON_BAN_REASONS,
	KICK_COLOUR,
	TIME_OUT_COLOUR,
	UNBAN_COLOUR,
} from "../utility/constants.js";
import { isCaseId } from "../utility/functions.js";

export const enum CaseType {
	Ban = 0,
	Unban = 1,
	Kick = 2,
	TimeOut = 3,
}

export interface CasesPacket {
	id: number;
	user_id: string;
	timestamp: Date;
	reason: string | null;
	message_id: string | null;
	actor_id: string;
	topics_thread_id: string | null;
	type: CaseType;
	action_ends_at: Date | null;
	username: string;
}

const CaseTypeToString = {
	[CaseType.Ban]: "Ban",
	[CaseType.Unban]: "Unban",
	[CaseType.Kick]: "Kick",
	[CaseType.TimeOut]: "Time-out",
} as const satisfies Readonly<Record<CaseType, string>>;

const CaseTypeToEmbedColour = {
	[CaseType.Ban]: BAN_COLOUR,
	[CaseType.Unban]: UNBAN_COLOUR,
	[CaseType.Kick]: KICK_COLOUR,
	[CaseType.TimeOut]: TIME_OUT_COLOUR,
} as const satisfies Readonly<Record<CaseType, number>>;

const AutoModerationRuleTriggerTypeToString = {
	[AutoModerationRuleTriggerType.Keyword]: "keyword",
	[AutoModerationRuleTriggerType.Spam]: "spam",
	[AutoModerationRuleTriggerType.KeywordPreset]: "keyword preset",
	[AutoModerationRuleTriggerType.MentionSpam]: "mention spam",
	[AutoModerationRuleTriggerType.MemberProfile]: "member profile",
} as const satisfies Record<Readonly<AutoModerationRuleTriggerType>, string>;

interface CaseEmbedOptions {
	type: CaseType;
	actor: User;
	userId: Snowflake;
	topicsThreadId?: Snowflake | null;
	reason?: string | null;
	caseNumber: number;
	createdAt: Date;
	actionEndsAt?: Date | null;
	username: string;
}

function caseEmbed({
	type,
	actor,
	userId,
	topicsThreadId,
	reason,
	caseNumber,
	createdAt,
	actionEndsAt,
	username,
}: CaseEmbedOptions) {
	const description = [
		`User: \`${username}\` ${userMention(userId)}`,
		`Type: ${CaseTypeToString[type]}`,
	];

	if (actionEndsAt) {
		description.push(`Ends at: ${time(actionEndsAt, TimestampStyles.RelativeTime)}`);
	}

	if (topicsThreadId) {
		description.push(`Thread: ${channelMention(topicsThreadId)}`);
	}

	description.push(`Reason: ${reason ?? "_No reason provided_"}`);

	return {
		author: { name: `${actor.tag} (${actor.id})`, icon_url: actor.displayAvatarURL() },
		color: CaseTypeToEmbedColour[type],
		description: description.join("\n"),
		footer: { text: `#${caseNumber}` },
		timestamp: createdAt.toISOString(),
	};
}

export function banAutocomplete(focused: string) {
	const focusedUppercase = focused.toUpperCase();

	return (
		focused === ""
			? COMMON_BAN_REASONS
			: COMMON_BAN_REASONS.filter((reason) => reason.toUpperCase().includes(focusedUppercase))
	).map((reason) => ({
		name: reason,
		value: reason,
	}));
}

interface HasRecentCaseOptions {
	type: CaseType;
	userId: Snowflake;
}

export async function hasRecentCase({ type, userId }: HasRecentCaseOptions) {
	return Boolean(
		await pg<CasesPacket>(Table.CasesDiscord)
			.select(pg.raw("1"))
			.where({ user_id: userId, type })
			.andWhere("timestamp", ">=", new Date(Date.now() - 5_000))
			.first(),
	);
}

interface CreateBanCaseOptionsBase {
	user: User;
	reason?: string;
	actor: User;
	createdAt: Date;
}

interface CreateBanCaseManualOptions extends CreateBanCaseOptionsBase {
	ban: false;
}

interface CreateBanCaseAutomaticOptions extends CreateBanCaseOptionsBase {
	ban: true;
	guild: Guild;
	deleteMessageSeconds?: number;
	topicsThread?: PublicThreadChannel | null;
}

export type CreateBanCaseOptions = CreateBanCaseManualOptions | CreateBanCaseAutomaticOptions;

export async function createBan(options: CreateBanCaseOptions) {
	const { ban, user, reason, actor, createdAt } = options;
	const topicsThread = "topicsThread" in options ? options.topicsThread : null;

	const [createdCase] = await pg<CasesPacket>(Table.CasesDiscord)
		.insert({
			user_id: user.id,
			timestamp: createdAt,
			reason,
			actor_id: actor.id,
			topics_thread_id: topicsThread?.id ?? null,
			type: CaseType.Ban,
			username: user.tag,
		})
		.returning("id");

	if (ban) {
		await options.guild.bans.create(user, {
			deleteMessageSeconds: options.deleteMessageSeconds,
			reason,
		});
	}

	const { id: messageId } = await actor.client
		.channel(DISCORD_CASES_CHANNEL_ID, ChannelType.GuildText)
		.send({
			embeds: [
				caseEmbed({
					type: CaseType.Ban,
					actor,
					userId: user.id,
					topicsThreadId: topicsThread?.id,
					reason,
					caseNumber: createdCase.id,
					createdAt,
					username: user.tag,
				}),
			],
		});

	await pg(Table.CasesDiscord).update({ message_id: messageId }).where({ id: createdCase.id });
	return messageId;
}

interface CreateUnbanCaseOptionsBase {
	user: User;
	actor: User;
	createdAt: Date;
}

interface CreateUnbanCaseManualOptions extends CreateUnbanCaseOptionsBase {
	unban: false;
	reason?: string;
}

interface CreateUnbanCaseAutomaticOptions extends CreateUnbanCaseOptionsBase {
	unban: true;
	guild: Guild;
	topicsThread: PublicThreadChannel;
	reason: string;
}

export type CreateUnbanCaseOptions = CreateUnbanCaseManualOptions | CreateUnbanCaseAutomaticOptions;

export async function createUnban(options: CreateUnbanCaseOptions) {
	const { unban, user, reason, actor, createdAt } = options;
	const topicsThread = "topicsThread" in options ? options.topicsThread : null;

	const [createdCase] = await pg<CasesPacket>(Table.CasesDiscord)
		.insert({
			user_id: user.id,
			timestamp: createdAt,
			reason,
			actor_id: actor.id,
			topics_thread_id: topicsThread?.id ?? null,
			type: CaseType.Unban,
			username: user.tag,
		})
		.returning("id");

	const caseNumber = createdCase.id;

	if (unban) {
		await options.guild.bans.remove(user, reason);
	}

	const { id: messageId } = await actor.client
		.channel(DISCORD_CASES_CHANNEL_ID, ChannelType.GuildText)
		.send({
			embeds: [
				caseEmbed({
					type: CaseType.Unban,
					actor,
					userId: user.id,
					topicsThreadId: topicsThread?.id,
					reason,
					caseNumber,
					createdAt,
					username: user.tag,
				}),
			],
		});

	await pg(Table.CasesDiscord).update({ message_id: messageId }).where({ id: createdCase.id });
	return messageId;
}

interface CreateKickCaseOptionsBase {
	user: User;
	reason?: string;
	actor: User;
	createdAt: Date;
}

interface CreateKickCaseManualOptions extends CreateKickCaseOptionsBase {
	kick: false;
}

interface CreateKickCaseAutomaticOptions extends CreateKickCaseOptionsBase {
	kick: true;
	guild: Guild;
	topicsThread?: PublicThreadChannel | null;
}

export type CreateKickCaseOptions = CreateKickCaseManualOptions | CreateKickCaseAutomaticOptions;

export async function createKick(options: CreateKickCaseOptions) {
	const { kick, user, reason, actor, createdAt } = options;
	const topicsThread = "topicsThread" in options ? options.topicsThread : null;

	const [createdCase] = await pg<CasesPacket>(Table.CasesDiscord)
		.insert({
			user_id: user.id,
			timestamp: createdAt,
			reason,
			actor_id: actor.id,
			topics_thread_id: topicsThread?.id ?? null,
			type: CaseType.Kick,
			username: user.tag,
		})
		.returning("id");

	const caseNumber = createdCase.id;

	if (kick) {
		await options.guild.members.kick(user, reason);
	}

	const { id: messageId } = await actor.client
		.channel(DISCORD_CASES_CHANNEL_ID, ChannelType.GuildText)
		.send({
			embeds: [
				caseEmbed({
					type: CaseType.Kick,
					actor,
					userId: user.id,
					topicsThreadId: topicsThread?.id,
					reason,
					caseNumber,
					createdAt,
					username: user.tag,
				}),
			],
		});

	await pg(Table.CasesDiscord).update({ message_id: messageId }).where({ id: createdCase.id });
	return messageId;
}

interface CreateTimeOutCaseOptionsBase {
	user: User;
	reason?: string;
	actor: User;
	createdAt: Date;
	actionEndsAt: Date;
}

interface CreateTimeOutCaseManualOptions extends CreateTimeOutCaseOptionsBase {
	timeOut: false;
}

interface CreateTimeOutCaseAutomaticOptions extends CreateTimeOutCaseOptionsBase {
	timeOut: true;
	guild: Guild;
	topicsThread?: PublicThreadChannel | null;
}

export type CreateTimeOutCaseOptions =
	| CreateTimeOutCaseManualOptions
	| CreateTimeOutCaseAutomaticOptions;

export async function createTimeOut(options: CreateTimeOutCaseOptions) {
	const { timeOut, user, reason, actor, createdAt, actionEndsAt } = options;
	const topicsThread = "topicsThread" in options ? options.topicsThread : null;

	const [createdCase] = await pg<CasesPacket>(Table.CasesDiscord)
		.insert({
			user_id: user.id,
			timestamp: createdAt,
			reason,
			actor_id: actor.id,
			topics_thread_id: topicsThread?.id ?? null,
			type: CaseType.TimeOut,
			action_ends_at: actionEndsAt,
			username: user.tag,
		})
		.returning("id");

	const caseNumber = createdCase.id;

	if (timeOut) {
		await options.guild.members.edit(user, {
			communicationDisabledUntil: actionEndsAt,
			reason: reason ? reason : `#${caseNumber}`,
		});
	}

	const { id: messageId } = await actor.client
		.channel(DISCORD_CASES_CHANNEL_ID, ChannelType.GuildText)
		.send({
			embeds: [
				caseEmbed({
					type: CaseType.TimeOut,
					actor,
					userId: user.id,
					topicsThreadId: topicsThread?.id,
					reason,
					caseNumber,
					createdAt,
					actionEndsAt,
					username: user.tag,
				}),
			],
		});

	await pg(Table.CasesDiscord).update({ message_id: messageId }).where({ id: createdCase.id });
	return messageId;
}

export async function handleAutoModerationActionExecution(
	autoModerationActionExecution: AutoModerationActionExecution,
) {
	// Only look for time-outs.
	if (autoModerationActionExecution.action.type !== AutoModerationActionType.Timeout) {
		return;
	}

	// Check to see if there is an existing case within the past five seconds for this user.
	// We probably do not need to do this.
	const existingCase = Boolean(
		await pg<CasesPacket>(Table.CasesDiscord)
			.select(pg.raw("1"))
			.where({ user_id: autoModerationActionExecution.userId, type: CaseType.TimeOut })
			.andWhere("timestamp", ">=", new Date(Date.now() - 5_000))
			.first(),
	);

	if (existingCase) {
		// There is an existing case for this. No need to go further.
		return;
	}

	// Create a case.
	await createTimeOut({
		timeOut: false,
		user: autoModerationActionExecution.user!,
		reason: `Auto moderation detection via ${AutoModerationRuleTriggerTypeToString[autoModerationActionExecution.ruleTriggerType]}.`,
		actor: autoModerationActionExecution.guild.client.user,
		createdAt: new Date(),
		actionEndsAt: new Date(
			Date.now() + autoModerationActionExecution.action.metadata.durationSeconds! * 1000,
		),
	});
}

export async function caseAutocomplete(focused: string) {
	let results: Pick<CasesPacket, "id" | "reason" | "type" | "username">[];

	if (focused === "") {
		results = await pg<CasesPacket>(Table.CasesDiscord)
			.select(["id", "reason", "type", "username"])
			.orderBy("id", "desc")
			.limit(10);
	} else {
		const caseNumber = Number(focused);

		let query = pg<CasesPacket>(Table.CasesDiscord)
			.where({ user_id: focused })
			.orWhere({ topics_thread_id: focused })
			.orWhere("reason", "ilike", `%${focused}%`)
			.orWhere("username", "ilike", `%${focused}%`);

		if (isCaseId(caseNumber)) {
			query = query.orWhere({ id: caseNumber });
		}

		results = await query.orderBy("id", "desc").limit(25);
	}

	return results.map((individualCase) => {
		const name = [
			`#${individualCase.id}`,
			`[${CaseTypeToString[individualCase.type]}]`,
			individualCase.username,
		];

		if (individualCase.reason) {
			name[name.length - 1] = `${individualCase.username}:`;
			name.push(`${individualCase.reason}`);
		}

		return { name: name.join(" "), value: individualCase.id };
	});
}

interface CaseEditOptions {
	caseNumber: number;
	reason?: string | null;
	topicsThreadId?: Snowflake | null;
}

export async function edit(
	client: Client<true>,
	{ caseNumber, reason, topicsThreadId }: CaseEditOptions,
) {
	const [editedCase] = await pg<CasesPacket>(Table.CasesDiscord)
		.update({ reason, topics_thread_id: topicsThreadId })
		.where({ id: caseNumber })
		.returning("*");

	const messageId = editedCase.message_id;

	if (messageId) {
		await client.channel(DISCORD_CASES_CHANNEL_ID, ChannelType.GuildText).messages.edit(messageId, {
			embeds: [
				caseEmbed({
					type: editedCase.type,
					actor: await client.users.fetch(editedCase.actor_id, { cache: false }),
					userId: editedCase.user_id,
					topicsThreadId: editedCase.topics_thread_id,
					reason: editedCase.reason,
					caseNumber: editedCase.id,
					createdAt: editedCase.timestamp,
					actionEndsAt: editedCase.action_ends_at,
					username: editedCase.username,
				}),
			],
		});
	}

	return messageId;
}
