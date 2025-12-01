import { AuditLogEvent, Events } from "discord.js";
import {
	CaseType,
	type CreateBanCaseOptions,
	type CreateKickCaseOptions,
	type CreateTimeOutCaseOptions,
	type CreateUnbanCaseOptions,
	createBan,
	createKick,
	createTimeOut,
	createUnban,
	hasRecentCase,
} from "../features/cases-discord.js";
import { GUILD_ID } from "../utility/configuration.js";
import type { Event } from "./index.js";

const name = Events.GuildAuditLogEntryCreate;

export default {
	name,
	async fire(auditLogEntry, guild) {
		if (guild.id !== GUILD_ID) {
			return;
		}

		if (auditLogEntry.isAction(AuditLogEvent.MemberKick)) {
			const executor =
				auditLogEntry.executor?.partial || auditLogEntry.executor === null
					? await guild.client.users.fetch(auditLogEntry.executorId!, { cache: false, force: true })
					: auditLogEntry.executor;

			const target =
				auditLogEntry.target?.partial || auditLogEntry.target === null
					? await guild.client.users.fetch(auditLogEntry.targetId!, { cache: false, force: true })
					: auditLogEntry.target;

			if (target.bot) {
				return;
			}

			if (await hasRecentCase({ type: CaseType.Kick, userId: target.id })) {
				return;
			}

			const createKickCaseOptions: CreateKickCaseOptions = {
				kick: false,
				user: target,
				actor: executor,
				createdAt: auditLogEntry.createdAt,
			};

			if (auditLogEntry.reason) {
				createKickCaseOptions.reason = auditLogEntry.reason;
			}

			await createKick(createKickCaseOptions);
			return;
		}

		if (auditLogEntry.isAction(AuditLogEvent.MemberBanAdd)) {
			const executor =
				auditLogEntry.executor?.partial || auditLogEntry.executor === null
					? await guild.client.users.fetch(auditLogEntry.executorId!, { cache: false, force: true })
					: auditLogEntry.executor;

			const target =
				auditLogEntry.target?.partial || auditLogEntry.target === null
					? await guild.client.users.fetch(auditLogEntry.targetId!, { cache: false, force: true })
					: auditLogEntry.target;

			if (target.bot) {
				return;
			}

			if (await hasRecentCase({ type: CaseType.Ban, userId: target.id })) {
				return;
			}

			const createBanCaseOptions: CreateBanCaseOptions = {
				ban: false,
				actor: executor,
				createdAt: auditLogEntry.createdAt,
				user: target,
			};

			if (auditLogEntry.reason) {
				createBanCaseOptions.reason = auditLogEntry.reason;
			}

			await createBan(createBanCaseOptions);
			return;
		}

		if (auditLogEntry.isAction(AuditLogEvent.MemberBanRemove)) {
			const executor =
				auditLogEntry.executor?.partial || auditLogEntry.executor === null
					? await guild.client.users.fetch(auditLogEntry.executorId!, { cache: false, force: true })
					: auditLogEntry.executor;

			const target =
				auditLogEntry.target?.partial || auditLogEntry.target === null
					? await guild.client.users.fetch(auditLogEntry.targetId!, { cache: false, force: true })
					: auditLogEntry.target;

			if (target.bot) {
				return;
			}

			if (await hasRecentCase({ type: CaseType.Unban, userId: target.id })) {
				return;
			}

			const createUnbanCaseOptions: CreateUnbanCaseOptions = {
				unban: false,
				user: target,
				actor: executor,
				createdAt: auditLogEntry.createdAt,
			};

			if (auditLogEntry.reason) {
				createUnbanCaseOptions.reason = auditLogEntry.reason;
			}

			await createUnban(createUnbanCaseOptions);
			return;
		}

		if (auditLogEntry.isAction(AuditLogEvent.MemberUpdate)) {
			const change = auditLogEntry.changes.find(
				(change) => change.key === "communication_disabled_until",
			);

			if (!change) {
				return;
			}

			if (change.old && !change.new) {
				// This time-out ended. Return.
				return;
			}

			const executor =
				auditLogEntry.executor?.partial || auditLogEntry.executor === null
					? await guild.client.users.fetch(auditLogEntry.executorId!, { cache: false, force: true })
					: auditLogEntry.executor;

			const target =
				auditLogEntry.target?.partial || auditLogEntry.target === null
					? await guild.client.users.fetch(auditLogEntry.targetId!, { cache: false, force: true })
					: auditLogEntry.target;

			if (await hasRecentCase({ type: CaseType.TimeOut, userId: target.id })) {
				return;
			}

			const createTimeOutCaseOptions: CreateTimeOutCaseOptions = {
				timeOut: false,
				user: target,
				actor: executor,
				createdAt: auditLogEntry.createdAt,
				actionEndsAt: new Date(change.new!),
			};

			if (auditLogEntry.reason) {
				createTimeOutCaseOptions.reason = auditLogEntry.reason;
			}

			await createTimeOut(createTimeOutCaseOptions);
			return;
		}
	},
} satisfies Event<typeof name>;
