import type { ClientEventTypes } from "discord.js";
import autoModerationActionExecution from "./auto-moderation-action-execution.js";
import guildAuditLogEntryCreate from "./guild-audit-log-entry-create.js";
import guildMemberAdd from "./guild-member-add.js";
import guildMemberRemove from "./guild-member-remove.js";
import guildMemberUpdate from "./guild-member-update.js";
import interactionCreate from "./interaction-create.js";
import messageCreate from "./message-create.js";
import messageDelete from "./message-delete.js";
import messageDeleteBulk from "./message-delete-bulk.js";
import messageReactionAdd from "./message-reaction-add.js";
import messageUpdate from "./message-update.js";
import ready from "./ready.js";

export interface Event<T extends keyof ClientEventTypes = keyof ClientEventTypes> {
	fire(this: void, ...parameters: ClientEventTypes[T]): Promise<void> | void;
	name: T;
	once?: boolean;
}

export default [
	autoModerationActionExecution,
	guildAuditLogEntryCreate,
	guildMemberAdd,
	guildMemberRemove,
	guildMemberUpdate,
	interactionCreate,
	messageCreate,
	messageDelete,
	messageDeleteBulk,
	messageReactionAdd,
	messageUpdate,
	ready,
] as const;
