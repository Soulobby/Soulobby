import { Events, PermissionFlagsBits } from "discord.js";
import { findCallByMessageId } from "../caches/calls.js";
import { messageLogHandleMessageUpdate } from "../features/message-log.js";
import { updateCall } from "../models/Calls.js";
import pino from "../pino.js";
import { CALLS_CHANNEL_ID, GUILD_ID } from "../utility/configuration.js";
import { shouldLogMessage } from "../utility/functions.js";
import type { Event } from "./index.js";

const name = Events.MessageUpdate;

export default {
	name,
	async fire(oldMessage, newMessage) {
		if (!(newMessage.guildId === GUILD_ID && newMessage.inGuild())) {
			return;
		}

		if (
			shouldLogMessage({
				bot: newMessage.author.bot,
				channel: newMessage.channel,
				guild: newMessage.guild,
			})
		) {
			try {
				await messageLogHandleMessageUpdate(oldMessage, newMessage);
			} catch (error) {
				pino.error(error, "Failed to log message update.");
			}
		}

		const calls = newMessage.client.channel(CALLS_CHANNEL_ID);

		if (newMessage.channelId === calls.id) {
			// This could be an existing call.
			const call = findCallByMessageId(newMessage.id);

			if (call) {
				await updateCall(call, newMessage);
				return;
			}

			if (
				!(
					newMessage.member &&
					calls.permissionsFor(newMessage.member).has(PermissionFlagsBits.ManageMessages)
				)
			) {
				await newMessage.delete();
			}
		}
	},
} satisfies Event<typeof name>;
