import { ChannelType, Events, MessageFlags, PermissionFlagsBits } from "discord.js";
import { messageLogUpsert } from "../features/message-log.js";
import { createCallFromMessage, lookupComponents } from "../models/Calls.js";
import { Report } from "../models/Report.js";
import pino from "../pino.js";
import {
	CALLS_CHANNEL_ID,
	GUILD_ID,
	QUEUE_CHAT_CHANNEL_ID,
	QUEUE_HELPER_ROLE_ID,
} from "../utility/configuration.js";
import { CallType } from "../utility/constants.js";
import { shouldLogMessage } from "../utility/functions.js";
import type { Event } from "./index.js";

const name = Events.MessageCreate;

export default {
	name,
	async fire(message) {
		if (!message.inGuild() || message.guild.id !== GUILD_ID) {
			return;
		}

		if (
			shouldLogMessage({ bot: message.author.bot, channel: message.channel, guild: message.guild })
		) {
			try {
				await messageLogUpsert(message);
			} catch (error) {
				pino.error(error, "Failed to log message create.");
			}
		}

		const report = Report.cache.get(message.channelId);

		if (report?.userId === message.author.id && !report.rankReportThreadId) {
			await report.forwardMessage(message);
			return;
		}

		if (message.nonce === "soulobby-call") {
			return;
		}

		const calls = message.client.channel(CALLS_CHANNEL_ID, ChannelType.GuildText);
		const { content } = message;
		const call = createCallFromMessage(content);
		const queueChat = message.client.channel(QUEUE_CHAT_CHANNEL_ID);

		if (call) {
			if (call.lookup) {
				if (message.channelId === calls.id) {
					await message.delete();
					return;
				}

				if (call.type === CallType.CorruptedScarabs) {
					return;
				}

				await message.channel.send({
					components: [lookupComponents(call)],
					flags: MessageFlags.IsComponentsV2,
				});

				return;
			}

			if (
				call.type === CallType.CorruptedEgg &&
				message.channelId === queueChat.id &&
				message.member?.roles.cache.has(QUEUE_HELPER_ROLE_ID)
			) {
				await call.createLog(message);
				return;
			}

			if (call.type === CallType.SoulObelisk || call.type === CallType.CorruptedScarabs) {
				if (message.channelId !== calls.id) {
					return;
				}

				await call.handle(message);
				return;
			}
		}

		if (
			message.channelId === calls.id &&
			(!message.member ||
				(message.member &&
					!calls.permissionsFor(message.member).has(PermissionFlagsBits.ManageMessages)))
		) {
			await message.delete();
		}
	},
} satisfies Event<typeof name>;
