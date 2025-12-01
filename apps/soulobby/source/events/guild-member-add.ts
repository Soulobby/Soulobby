import { Events, UserFlags } from "discord.js";
import { memberLogSendJoinLeave } from "../features/member-log.js";
import Friend from "../models/Friend.js";
import pino from "../pino.js";
import { GUILD_ID } from "../utility/configuration.js";
import type { Event } from "./index.js";

const name = Events.GuildMemberAdd;

export default {
	name,
	async fire(guildMember) {
		if (guildMember.guild.id !== GUILD_ID) {
			return;
		}

		try {
			await memberLogSendJoinLeave(guildMember, true);
		} catch (error) {
			pino.error(error, "Failed to log member join.");
		}

		if (guildMember.user.flags?.has(UserFlags.Spammer)) {
			await guildMember.kick("Spammer flag detected (GMA).");
			return;
		}

		await Friend.cache.find(({ userId }) => userId === guildMember.id)?.updateRoles();
	},
} satisfies Event<typeof name>;
