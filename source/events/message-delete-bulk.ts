import { Events } from "discord.js";
import { findCallByMessageId } from "../caches/calls.js";
import { messageLogHandleMessageDeleteBulk } from "../features/message-log.js";
import { deleteCall } from "../models/Calls.js";
import pino from "../pino.js";
import { CALLS_CHANNEL_ID, GUILD_ID } from "../utility/configuration.js";
import { shouldLogMessage } from "../utility/functions.js";
import type { Event } from "./index.js";

const name = Events.MessageBulkDelete;

export default {
	name,
	async fire(messages, channel) {
		if (channel.guildId !== GUILD_ID) {
			return;
		}

		// Always log these.
		if (shouldLogMessage({ bot: false, channel, guild: channel.guild })) {
			try {
				await messageLogHandleMessageDeleteBulk(messages, channel);
			} catch (error) {
				pino.error(error, "Failed to log message bulk delete.");
			}
		}

		if (channel.id === CALLS_CHANNEL_ID) {
			for (const message of messages.values()) {
				// This could be an existing call.
				const call = findCallByMessageId(message.id);

				if (call) {
					await deleteCall(call, message.client);
				}
			}
		}
	},
} satisfies Event<typeof name>;
