import {
	type ChatInputCommandInteraction,
	MessageFlags,
	TimestampStyles,
	type UserContextMenuCommandInteraction,
} from "discord.js";
import { hiScore, profile } from "runescape";
import Request from "../../models/Request.js";
import UserData from "../../models/UserData.js";
import { QUEUE_CHAT_CHANNEL_ID } from "../../utility/configuration.js";
import { type RequestCompletedStatusViaUser, RequestStatus } from "../../utility/constants.js";
import { consoleLog, isRSN, time } from "../../utility/functions.js";

export default {
	name: "request" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		switch (interaction.options.getSubcommand()) {
			case "allow": {
				await this.allow(interaction);
				return;
			}
			case "close": {
				await this.close(interaction);
				return;
			}
			case "edit": {
				await this.edit(interaction);
				return;
			}
			case "info": {
				await this.info(interaction);
				return;
			}
			case "verify": {
				await this.verify(interaction);
			}
		}
	},
	async allow(interaction: ChatInputCommandInteraction<"cached">) {
		const { options } = interaction;
		const requestMember = options.getMember("member");
		const requestUser = options.getUser("member", true);

		if (!requestMember) {
			await interaction.reply({
				content: `Cannot find ${requestUser} in this server.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (requestUser.bot) {
			await interaction.reply({
				content: "This account cannot be modified.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (requestMember.pending) {
			await interaction.reply({
				content: `${requestUser} has not yet passed membership screening.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await UserData.edit(requestMember.id, { requestOverride: true });

		await interaction.reply({
			allowedMentions: { parse: [] },
			content: `Successfully added a request creation override for ${requestMember}.`,
		});
	},
	async close(interaction: ChatInputCommandInteraction<"cached">) {
		const request = Request.cache.find(
			({ status, channelId }) =>
				status === RequestStatus.Active && channelId === interaction.channelId,
		);

		if (!request) {
			await interaction.reply({
				content: "You can only use this command in an active request channel.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (request.delay !== null) {
			await interaction.reply({
				content: "This request is already being closed (delayed).",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const status = (interaction.options.getInteger("reason") ??
			RequestStatus.Claimed) as RequestCompletedStatusViaUser;

		const delay = interaction.options.getBoolean("delay") ?? false;

		if (status === RequestStatus.ApplicationFailed) {
			if (request.verified) {
				await interaction.reply({
					content: "This request has been verified. It cannot be closed for this reason.",
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			if (request.under3Days) {
				await interaction.reply({
					content: `It has not yet been 3 days since the beginning of this request. This request can be closed for this reason at ${time(
						request.creationTimestamp + 259_200_000,
						TimestampStyles.LongDateTime,
						true,
					)}.`,
					flags: MessageFlags.Ephemeral,
				});

				return;
			}
		}

		if (status === RequestStatus.Unresponsive && request.under7Days) {
			await interaction.reply({
				content: `It has not yet been 1 week since the beginning of this request. This request can be closed for this reason at ${time(
					request.creationTimestamp + 604_800_000,
					TimestampStyles.LongDateTime,
					true,
				)}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await interaction.deferReply({ flags: delay ? MessageFlags.Ephemeral : undefined });
		const closeTime = interaction.createdAt;

		if (delay) {
			closeTime.setUTCMinutes(closeTime.getUTCMinutes() + 1);
		}

		await request.close(status, interaction, closeTime, delay);
	},
	async edit(interaction: ChatInputCommandInteraction<"cached">) {
		const queueChat = interaction.client.channel(QUEUE_CHAT_CHANNEL_ID);

		if (interaction.channelId !== queueChat.id) {
			await interaction.reply({
				content: `Please use this command in ${queueChat}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await interaction.deferReply();
		const { options } = interaction;
		const request = Request.cache.get(options.getInteger("number", true));

		if (!request) {
			await interaction.editReply("Cannot interpret the provided request.");
			return;
		}

		if (options.data[0].options!.length === 1) {
			await interaction.editReply("There was nothing to edit.");
			return;
		}

		const status = (options.getInteger("reason") ?? request.status) as RequestStatus;
		const rawCompletionTimestamp = options.getInteger("completion-timestamp");

		const completionTimestamp =
			rawCompletionTimestamp === null
				? request.completionTimestamp
				: new Date(rawCompletionTimestamp);

		if (request.channel === null) {
			await interaction.editReply("The request channel must still exist.");
			return;
		}

		if (request.status === RequestStatus.Active && status !== RequestStatus.Active) {
			await interaction.editReply(
				"The close value can only be altered if the request has been marked as complete.",
			);

			return;
		}

		if (request.completionTimestamp === null && completionTimestamp !== null) {
			await interaction.editReply(
				"The completion timestamp can only be altered if the request has been marked as complete.",
			);

			return;
		}

		if (
			completionTimestamp !== null &&
			completionTimestamp.getTime() <= request.creationTimestamp
		) {
			await interaction.editReply(
				"Completion timestamp cannot be earlier than a request channel's creation timestamp!",
			);

			return;
		}

		if (status === request.status && completionTimestamp === request.completionTimestamp) {
			await interaction.editReply("There was nothing to edit.");
			return;
		}

		await request.edit(interaction, {
			status,
			completion_timestamp: completionTimestamp,
		});
	},
	async info(
		interaction:
			| ChatInputCommandInteraction<"cached">
			| UserContextMenuCommandInteraction<"cached">,
	) {
		await Request.information(interaction);
	},
	async verify(interaction: ChatInputCommandInteraction<"cached">) {
		const request = Request.cache.find(
			({ status, channelId }) =>
				status === RequestStatus.Active && channelId === interaction.channelId,
		);

		if (!request) {
			await interaction.reply({
				content: "You can only use this command in an active request channel.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const { application, channel, verified } = request;

		if (
			10 - Math.ceil((Date.now() - request.applicationRateLimit) / 60_000) > 0 &&
			// Account for legacy behaviour.
			(application === null ? channel!.topic : verified)
		) {
			await interaction.reply({
				content: `This command may be used again ${time(
					request.applicationRateLimit + 600_000,
					TimestampStyles.RelativeTime,
				)}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await interaction.deferReply({ flags: verified ? MessageFlags.Ephemeral : undefined });
		const { options } = interaction;
		const name = options.getString("name") ?? application?.RSN;
		const VIP = options.getBoolean("premier-club") ?? application?.VIP;
		const sophAccess = options.getBoolean("sophanem") ?? application?.sophAccess;
		let totalLevel = application?.totalLevel;

		if (!name) {
			await interaction.editReply("Unable to infer the RSN. Please explicitly pass this.");
			return;
		}

		if (totalLevel === undefined) {
			await interaction.editReply(
				"Unable to infer the total level. Please explicitly pass the RSN.",
			);

			return;
		}

		if (VIP === undefined) {
			await interaction.editReply(
				"Unable to infer the Premier Membership. Please explicitly pass this.",
			);

			return;
		}

		if (sophAccess === undefined) {
			await interaction.editReply(
				"Unable to infer the Sophanem access. Please explicitly pass this.",
			);

			return;
		}

		if (!isRSN(name)) {
			await interaction.editReply("Cannot interpret the provided RSN.");
			return;
		}

		let RSN = name;

		if (options.getString("name")) {
			const data =
				(await profile({ activities: 0, name }).catch(consoleLog)) ??
				(await hiScore({ name }).catch(consoleLog));

			if (!data) {
				await interaction.editReply(
					`Cannot find the HiScores of \`${RSN}\` and the RuneMetrics profile was not public. Does this account exist?`,
				);

				return;
			}

			if ("totalSkill" in data) {
				totalLevel = data.totalSkill;
				RSN = data.name;
			} else {
				totalLevel = data.total.level;
			}
		}

		if (
			verified &&
			application?.RSN === RSN &&
			application?.totalLevel === totalLevel &&
			application?.VIP === VIP &&
			application?.sophAccess === sophAccess
		) {
			await interaction.editReply(
				`You tried changing ${channel}'s application to what it already was.`,
			);
			return;
		}

		await request.verify(interaction, { RSN, totalLevel, VIP, sophAccess });
	},
} as const;
