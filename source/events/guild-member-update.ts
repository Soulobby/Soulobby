import { Events, UserFlags } from "discord.js";
import { GUILD_ID } from "../utility/configuration.js";
import type { Event } from "./index.js";

const name = Events.GuildMemberUpdate;

export default {
	name,
	async fire(_, newMember) {
		if (newMember.guild.id !== GUILD_ID) {
			return;
		}

		if (newMember.user.flags?.has(UserFlags.Spammer)) {
			await newMember.kick("Spammer flag detected (GMU).");
			return;
		}
	},
} satisfies Event<typeof name>;
