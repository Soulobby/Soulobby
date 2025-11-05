import { Events, PermissionFlagsBits } from "discord.js";
import { CALLS_CHANNEL_ID, GUILD_ID } from "../utility/configuration.js";
import { EMOJIS } from "../utility/emojis.js";
import type { Event } from "./index.js";

const name = Events.MessageReactionAdd;

export default {
	name,
	async fire(messageReaction, user, _) {
		if (messageReaction.message.guildId !== GUILD_ID) {
			return;
		}

		const calls = messageReaction.client.channel(CALLS_CHANNEL_ID);

		if (messageReaction.message.channelId === calls.id) {
			if (
				calls
					.permissionsFor(await messageReaction.client.guild.members.fetch(user.id))
					.has(PermissionFlagsBits.ManageMessages)
			) {
				return;
			}

			if (
				messageReaction.emoji.name !== "❌" &&
				messageReaction.emoji.id !== EMOJIS.SoulObelisk.id &&
				messageReaction.emoji.id !== EMOJIS.Scarabs.id
			) {
				void messageReaction.users.remove(user.id);
			}
		}
	},
} satisfies Event<typeof name>;
