import { Events, userMention } from "discord.js";
import { memberLogSendJoinLeave } from "../features/member-log.js";
import Request from "../models/Request.js";
import { GUILD_ID } from "../utility/configuration.js";
import { RequestStatus } from "../utility/constants.js";
import { LogType } from "../utility/functions.js";
import type { Event } from "./index.js";

const name = Events.GuildMemberRemove;

export default {
	name,
	async fire(member) {
		if (member.guild.id !== GUILD_ID) {
			return;
		}

		try {
			await memberLogSendJoinLeave(member, false);
		} catch (error) {
			void member.client.log({ content: "Failed to log member leave.", error });
		}

		for (const settle of await Promise.allSettled(
			Request.cache
				.filter(
					({ userId, status, delay }) =>
						userId === member.user.id && status === RequestStatus.Active && delay === null,
				)
				.map(async (request) => request.close(RequestStatus.LeftGuild)),
		)) {
			if (settle.status === "fulfilled") {
				continue;
			}

			void member.client.log({
				content: `Failed to automatically close the request (due to leaving the server) belonging to ${userMention(
					member.user.id,
				)} (${member.user.tag}).`,
				error: settle.reason,
				type: LogType.CorruptedEggQueue,
			});
		}
	},
} satisfies Event<typeof name>;
