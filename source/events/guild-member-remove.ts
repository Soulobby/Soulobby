import { Events } from "discord.js";
import { memberLogSendJoinLeave } from "../features/member-log.js";
import Request from "../models/Request.js";
import pino from "../pino.js";
import { GUILD_ID } from "../utility/configuration.js";
import { RequestStatus } from "../utility/constants.js";
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
			pino.error(error, "Failed to log member leave.");
		}

		const requestErrors = [];

		for (const settle of await Promise.allSettled(
			Request.cache
				.filter(
					({ userId, status, delay }) =>
						userId === member.user.id && status === RequestStatus.Active && delay === null,
				)
				.map((request) => request.close(RequestStatus.LeftGuild)),
		)) {
			if (settle.status === "fulfilled") {
				continue;
			}

			requestErrors.push(settle.reason);
		}

		if (requestErrors.length > 0) {
			pino.error(
				new AggregateError(
					requestErrors,
					`Failed to automatically close requests belonging to ${member.user.id}.`,
				),
			);
		}
	},
} satisfies Event<typeof name>;
