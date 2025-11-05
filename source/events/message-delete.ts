import { Events } from "discord.js";
import { findCallByMessageId } from "../caches/calls.js";
import { messageLogHandleMessageDelete } from "../features/message-log.js";
import { deleteCall } from "../models/Calls.js";
import { CALLS_CHANNEL_ID, GUILD_ID } from "../utility/configuration.js";
import { shouldLogMessage } from "../utility/functions.js";
import type { Event } from "./index.js";

const name = Events.MessageDelete;

export default {
	name,
	async fire(message) {
		if (!message.inGuild() || message.guild.id !== GUILD_ID) {
			return;
		}

		if (
			shouldLogMessage({
				// May still be not present.
				bot: message.author?.bot ?? false,
				channel: message.channel,
				guild: message.guild,
			})
		) {
			try {
				await messageLogHandleMessageDelete(message);
			} catch (error) {
				void message.client.log({ content: "Failed to log message delete.", error });
			}
		}

		if (message.channelId === CALLS_CHANNEL_ID) {
			// This could be an existing call.
			const call = findCallByMessageId(message.id);

			if (call) {
				await deleteCall(call, message.client);
			}
		}
	},
} satisfies Event<typeof name>;
