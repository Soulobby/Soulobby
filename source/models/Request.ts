import { Buffer } from "node:buffer";
import { clearTimeout, setTimeout } from "node:timers";
import { URL } from "node:url";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
	ActionRowBuilder,
	type ButtonInteraction,
	ChannelType,
	type ChatInputCommandInteraction,
	type Client,
	Collection,
	ContainerBuilder,
	channelMention,
	DangerButtonBuilder,
	DiscordAPIError,
	EmbedBuilder,
	formatEmoji,
	type Message,
	type MessageCreateOptions,
	MessageFlags,
	ModalBuilder,
	type ModalSubmitInteraction,
	type OverwriteResolvable,
	OverwriteType,
	PermissionFlagsBits,
	RESTJSONErrorCodes,
	roleMention,
	SecondaryButtonBuilder,
	SeparatorSpacingSize,
	type Snowflake,
	SnowflakeUtil,
	type TextChannel,
	TextDisplayBuilder,
	TextInputStyle,
	TimestampStyles,
	type User,
	type UserContextMenuCommandInteraction,
	userMention,
} from "discord.js";
import { hash } from "hasha";
import { hiScore, profile } from "runescape";
import pg, { Table } from "../pg.js";
import S3Client from "../s3-client.js";
import {
	CDN_BUCKET,
	CDN_URL,
	CORRUPTED_ARCHIVE_CHANNEL_ID,
	CORRUPTED_EGG_QUEUE_CHANNEL_ID,
	CORRUPTED_HELP_CHANNEL_ID,
	QUEUE_CHAT_CHANNEL_ID,
	QUEUE_CHAT1_MESSAGE_ID,
	QUEUE_HELPER_ROLE_ID,
	QUEUE_VIEW_CHANNEL_ID,
	SANDY_ROLE_ID,
} from "../utility/configuration.js";
import {
	CORRUPTED_EGG_QUEUE_ACHIEVEMENT_EXAMPLE,
	HOW_TO_TAKE_A_SCREENSHOT_URL,
	MAXIMUM_RSN_LENGTH,
	MINIMUM_RSN_LENGTH,
	type RequestCompletedStatus,
	type RequestCompletedStatusViaUser,
	RequestStatus,
} from "../utility/constants.js";
import { CustomId } from "../utility/custom-id.js";
import { EMOJIS } from "../utility/emojis.js";
import {
	displayAvatarURL,
	fetchAllMessages,
	isValidAttachment,
	LogType,
	time,
	transcript,
} from "../utility/functions.js";
import Base from "./Base.js";
import UserData from "./UserData.js";

const PREMIER_MEMBERSHIP_VALUE = "premier" as const;
const SOPHANEM_ACCESS_VALUE = "sophanem" as const;

export interface RequestPacket {
	id: number;
	user_id: Snowflake;
	status: RequestStatus;
	channel_id: Snowflake;
	completion_timestamp: Date | null;
	transcript: string | null;
	lookup: Snowflake;
	// Past applications may have nullable behaviour.
	application: RequestApplication | null;
	verified: boolean;
}

interface RequestData {
	id: number;
	userId: Snowflake;
	status: RequestStatus;
	channelId: Snowflake;
	completionTimestamp: Date | null;
	transcript: string | null;
	lookup: Snowflake;
	application: RequestApplication | null;
	verified: boolean;
}

type RequestPatchData = Omit<RequestPacket, "id" | "user_id" | "channel_id" | "lookup">;
type RequestEditData = Pick<RequestPacket, "status" | "completion_timestamp">;

interface RequestApplication {
	RSN: string;
	VIP: boolean;
	sophAccess: boolean;
	totalLevel: number;
}

interface RequestLookup {
	id: RequestData["id"];
	userId: RequestData["userId"];
	status: RequestData["status"];
	channelId: RequestData["channelId"];
	creationTimestamp: number;
	completionTimestamp?: RequestData["completionTimestamp"];
	transcript?: RequestData["transcript"];
	application?: RequestData["application"];
	newRequest?: boolean;
}

interface RequestGenerateMessageExternalLinkOptions {
	externalLink: true;
	user: User;
	application: RequestApplication;
	url: string;
}

interface RequestGenerateMessageFileUploadOptions {
	externalLink: false;
	user: User;
	application: RequestApplication;
	filename: string;
	url: string;
}

type RequestGenerateMessageOptions =
	| RequestGenerateMessageExternalLinkOptions
	| RequestGenerateMessageFileUploadOptions;

export const REQUEST_ROLE_CUSTOM_ID = "REQUEST_ROLE_CUSTOM_ID" as const;

export default class Request extends Base {
	public static readonly cache = new Collection<number, Request>();

	public readonly id: RequestData["id"];

	public readonly userId: RequestData["userId"];

	public status!: RequestData["status"];

	public readonly channelId: RequestData["channelId"];

	public completionTimestamp!: RequestData["completionTimestamp"];

	public transcript!: RequestData["transcript"];

	public readonly lookup: RequestData["lookup"];

	public application!: RequestData["application"];

	public verified!: RequestData["verified"];

	public readonly creationTimestamp: number;

	public applicationRateLimit = Date.now();

	public delay: NodeJS.Timeout | null = null;

	public constructor(client: Client, data: RequestPacket) {
		super(client);
		this.id = data.id;
		this.userId = data.user_id;
		this.channelId = data.channel_id;
		this.lookup = data.lookup;
		this.creationTimestamp = Number(SnowflakeUtil.deconstruct(this.channelId).timestamp);
		this.patch(data);
	}

	private patch(data: RequestPatchData) {
		this.status = data.status;
		this.completionTimestamp = data.completion_timestamp;
		this.transcript = data.transcript;
		this.application = data.application;
		this.verified = data.verified;
	}

	public static async healthCheck(client: Client) {
		for (const request of this.cache.values()) {
			if (request.status === RequestStatus.Active) {
				try {
					await client.guild.members.fetch(request.userId);
				} catch (error) {
					if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMember) {
						await request.close(RequestStatus.LeftGuild);
					}
				}
			}
		}
	}

	public static async validateNewRequest(interaction: ButtonInteraction<"cached">) {
		const logText = `${interaction.user} (${interaction.user.tag}) interacted with the "${interaction.component.label}" button. `;

		const requestOverride = Boolean(
			(await UserData.fetch(interaction.user.id).catch(() => null))?.requestOverride,
		);

		const corruptedEggQueue = interaction.client.channel(
			CORRUPTED_EGG_QUEUE_CHANNEL_ID,
			ChannelType.GuildCategory,
		);

		if (!requestOverride) {
			const queueHelperMention = roleMention(QUEUE_HELPER_ROLE_ID);
			const sandyMention = roleMention(SANDY_ROLE_ID);
			const corruptedHelp = interaction.client.channel(CORRUPTED_HELP_CHANNEL_ID);
			const requests = this.cache.filter(({ userId }) => userId === interaction.user.id);
			const currentRequests = requests.filter(({ status }) => status === RequestStatus.Active);

			if (currentRequests.size > 0) {
				void interaction.client.log({
					content: `${logText}User already has current requests: ${currentRequests
						.map(({ channelId }) => channelMention(channelId))
						.join(" & ")}`,
					type: LogType.CorruptedEggQueue,
				});

				await interaction.reply({
					content: `You already have ${
						currentRequests.size === 1
							? `a request! ${channelMention(currentRequests.first()!.channelId)}`
							: `multiple requests with us!\n${currentRequests
									.map(({ channelId }) => `- ${channelMention(channelId)}`)
									.join("\n")}`
					}`,
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			if (interaction.member.roles.cache.has(SANDY_ROLE_ID)) {
				void interaction.client.log({
					content: `${logText}User already has the ${sandyMention} title.`,
					type: LogType.CorruptedEggQueue,
				});

				await interaction.reply({
					content: `You already have the ${sandyMention} title (and thus Ishhara)! Contact a ${queueHelperMention} if you need to open another request.`,
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			if (requests.size > 0) {
				const lastStatus = requests.last()!.status as RequestCompletedStatus;

				void interaction.client.log({
					content: `${logText}User already has a completed request with us. Most recent completion status: \`${lastStatus}\``,
					type: LogType.CorruptedEggQueue,
				});

				switch (lastStatus) {
					case RequestStatus.Claimed:
					case RequestStatus.ClaimedSelf: {
						await interaction.reply({
							content: `You have already claimed a corrupted egg! Contact a ${queueHelperMention} if you need to open another request.`,
							flags: MessageFlags.Ephemeral,
						});

						return;
					}
					case RequestStatus.LeftGuild: {
						await interaction.reply({
							content: `You have already made a request. You have been removed from the queue due to no longer being in this Discord server in the middle of your request. Please read ${corruptedHelp} and then contact a ${queueHelperMention}.`,
							flags: MessageFlags.Ephemeral,
						});

						return;
					}
					case RequestStatus.DecidedAgainstService: {
						await interaction.reply({
							content: `You have decided against using our service. If you wish to make a request, please read ${corruptedHelp} and then contact a ${queueHelperMention}.`,
							flags: MessageFlags.Ephemeral,
						});

						return;
					}
					case RequestStatus.HadIshhara: {
						await interaction.reply({
							content: `You were removed from the queue due to already having Ishhara. Contact a ${queueHelperMention} if you need to open another request.`,
							flags: MessageFlags.Ephemeral,
						});

						return;
					}
					case RequestStatus.Unresponsive: {
						await interaction.reply({
							content: `For not communicating for at least a week in your previous request, you have been removed from the queue. Please read ${corruptedHelp} and then contact a ${queueHelperMention}.`,
							flags: MessageFlags.Ephemeral,
						});

						return;
					}
					case RequestStatus.NotForSelf: {
						await interaction.reply({
							content: `For either making a request for someone else or for giving your corrupted egg away, you have been removed from the queue. Please read ${corruptedHelp} and then contact a ${queueHelperMention}.`,
							flags: MessageFlags.Ephemeral,
						});

						return;
					}
					case RequestStatus.UsedServiceToBuyOrSell: {
						await interaction.reply({
							content:
								"You have used our service to buy or sell a corrupted egg. You cannot make a request.",
							flags: MessageFlags.Ephemeral,
						});

						return;
					}
					case RequestStatus.ApplicationFailed: {
						await interaction.reply({
							content: `You failed to complete your application in a timely manner. Please _fully_ read ${corruptedHelp} and then contact a ${queueHelperMention}.`,
							flags: MessageFlags.Ephemeral,
						});

						return;
					}
				}
			}
		}

		if (
			interaction.client.guild.channels.cache.size >= 500 ||
			corruptedEggQueue.children.cache.size >= 50
		) {
			void interaction.client.log({
				content: `${logText}Too many channels to create a request.`,
				type: LogType.CorruptedEggQueue,
			});

			await interaction.reply({
				content: "We are not accepting requests at the moment. Please try again later.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		void interaction.client.log({
			content: `${logText}Modal shown${requestOverride ? " with a request creation override" : ""}.`,
			type: LogType.CorruptedEggQueue,
		});

		await interaction.showModal(
			new ModalBuilder()
				.setCustomId(CustomId.RequestModal)
				.setTitle("Corrupted Egg Request")
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent("## Disclaimer\n\nWe do not support Leagues."),
				)
				.addLabelComponents((label) =>
					label
						.setLabel("What is your player name?")
						.setTextInputComponent((textInput) =>
							textInput
								.setCustomId(CustomId.RequestModalPlayerName)
								.setMinLength(MINIMUM_RSN_LENGTH)
								.setMaxLength(MAXIMUM_RSN_LENGTH)
								.setRequired()
								.setStyle(TextInputStyle.Short),
						),
				)
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`Send a screenshot of the "Gotta catch 'em both!" achievement expanded to prove you need Ishhara. This achievement is found in Hero -> Achievements -> Exploration -> Menaphos.\n[Example](${CORRUPTED_EGG_QUEUE_ACHIEVEMENT_EXAMPLE}) ([How to take a screenshot](${HOW_TO_TAKE_A_SCREENSHOT_URL}))`,
					),
				)
				.addLabelComponents(
					(label) =>
						label
							.setLabel("Upload Ishhara proof!")
							.setFileUploadComponent((fileUpload) =>
								fileUpload
									.setCustomId(CustomId.RequestModalIshharaProof)
									.setMaxValues(1)
									.setMinValues(1)
									.setRequired(),
							),
					(label) =>
						label
							.setLabel("More information about you helps!")
							.setDescription("There are certain things you may have that could help us both!")
							.setStringSelectMenuComponent((stringSelectMenu) =>
								stringSelectMenu
									.setCustomId(CustomId.RequestModalMetadata)
									.setMinValues(0)
									.setMaxValues(2)
									.setOptions(
										(stringSelectMenuOption) =>
											stringSelectMenuOption
												.setLabel("Premier membership")
												.setDescription("Are you able to access world 52?")
												.setValue(PREMIER_MEMBERSHIP_VALUE),
										(stringSelectMenuOption) =>
											stringSelectMenuOption
												.setLabel("Sophanem access")
												.setDescription(
													"Do you have access to Sophanem? Menaphos access is not required to obtain one!",
												)
												.setValue(SOPHANEM_ACCESS_VALUE),
									)
									.setPlaceholder("Select all that apply.")
									.setRequired(false),
							),
				),
		);
	}

	public static async create(interaction: ModalSubmitInteraction<"cached">) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const { components, user } = interaction;
		const rawRSN = components.getTextInputValue(CustomId.RequestModalPlayerName);
		const metadata = components.getStringSelectValues(CustomId.RequestModalMetadata);

		const ishharaProof = components
			.getUploadedFiles(CustomId.RequestModalIshharaProof, true)
			.first()!;

		const error = [];

		const data =
			(await profile({ name: rawRSN, activities: 0 }).catch(() => null)) ??
			(await hiScore({ name: rawRSN }).catch(() => null));

		if (!data) {
			error.push(
				`- \`${rawRSN}\` is not on the HiScores and does not have a public RuneMetrics profile. Is the RSN correct?`,
			);
		}

		if (!isValidAttachment(ishharaProof)) {
			error.push(
				"- Please ensure you upload a valid image! It must be under 5 mebibytes and either a WebP, JPEG, or PNG file.",
			);
		}

		if (error.length > 0) {
			const errors = error.join("\n");

			void interaction.client.log({
				content: `${user} (${user.tag}) submitted their request application. Invalid fields detected:\n${errors}`,
				type: LogType.CorruptedEggQueue,
			});

			await interaction.editReply(`Issues detected upon submitting your request:\n${errors}`);
			return;
		}

		const RSN = "name" in data! ? data.name : rawRSN;
		const totalLevel = "totalSkill" in data! ? data.totalSkill : data!.total.level;
		const VIP = metadata.includes(PREMIER_MEMBERSHIP_VALUE);
		const sophAccess = metadata.includes(SOPHANEM_ACCESS_VALUE);
		const application = { RSN, totalLevel, VIP, sophAccess };

		const corruptedEggQueue = interaction.client.channel(
			CORRUPTED_EGG_QUEUE_CHANNEL_ID,
			ChannelType.GuildCategory,
		);

		const [packet] = await pg<RequestPacket>(Table.Requests)
			.insert({ user_id: user.id, status: RequestStatus.Active, application })
			.returning("*");

		const permissionOverwrites: OverwriteResolvable[] = [
			...corruptedEggQueue.permissionOverwrites.cache.clone().values(),
		];

		permissionOverwrites.push({
			type: OverwriteType.Member,
			id: user.id,
			allow: PermissionFlagsBits.ViewChannel,
			deny: 0n,
		});
		let channel: TextChannel;

		const requestChannelCreateBaseOptions = {
			parent: corruptedEggQueue,
			permissionOverwrites,
			topic: this.applicationFormat(application),
			type: ChannelType.GuildText,
		} as const;

		try {
			channel = await interaction.client.guild.channels.create({
				name: `request-${packet.id}`,
				...requestChannelCreateBaseOptions,
			});
		} catch (error) {
			if (
				error instanceof DiscordAPIError &&
				error.status === 400 &&
				error.code === RESTJSONErrorCodes.InvalidFormBodyOrContentType &&
				error.message.includes("Server Discovery")
			) {
				// Assume this is because the channel name (the number) is disallowed via Server Discovery rules.
				channel = await interaction.client.guild.channels.create({
					name: "request-∞",
					...requestChannelCreateBaseOptions,
				});
			} else {
				// This errored for other reasons.
				throw error;
			}
		}

		const lookup = await this.updateLookup(interaction.client, {
			id: packet.id,
			userId: user.id,
			status: RequestStatus.Active,
			channelId: channel.id,
			creationTimestamp: channel.createdTimestamp,
			newRequest: true,
		});

		const [packet2] = await pg<RequestPacket>(Table.Requests)
			.update({ channel_id: channel.id, lookup: lookup.id })
			.where({ id: packet.id })
			.returning("*");

		const request = new this(interaction.client, packet2);
		this.cache.set(request.id, request);

		void interaction.client.log({
			content: `A new request has just been made by ${user} (${user.tag}). ${channel}`,
			type: LogType.CorruptedEggQueue,
		});

		await interaction.editReply(`You have been added to the queue! ${channel}`);
		const ishharaProofFilename = `${user.id}-proof.${ishharaProof.name.slice(ishharaProof.name.lastIndexOf(".") + 1)}`;
		let requestMessage: Message;

		try {
			requestMessage = await channel.send(
				this.generateMessage({
					externalLink: false,
					user,
					application,
					filename: ishharaProofFilename,
					url: ishharaProof.url,
				}),
			);
		} catch (error) {
			// Fuck Undici.
			if (
				!(error instanceof TypeError) ||
				error.message !== "Cannot read properties of null (reading 'byteLength')"
			) {
				throw error;
			}

			requestMessage = await channel.send(
				this.generateMessage({ externalLink: true, user, application, url: ishharaProof.url }),
			);
		}

		await requestMessage.pin();
		await this.updateQueueStats(interaction.client);
		await UserData.edit(user.id, { requestOverride: false });
	}

	private static generateMessage(options: RequestGenerateMessageOptions): MessageCreateOptions {
		const {
			externalLink,
			user,
			application: { RSN, totalLevel, VIP, sophAccess },
			url,
		} = options;

		const tick = formatEmoji(EMOJIS.Tick);
		const cross = formatEmoji(EMOJIS.Cross);

		return {
			components: [
				new TextDisplayBuilder().setContent(
					`Hello, ${user}! This is your request channel. As a reminder, here is what you submitted:`,
				),
				new ContainerBuilder().addSectionComponents((section) =>
					(externalLink
						? section.setLinkButtonAccessory((linkButton) =>
								linkButton.setLabel("Proof").setURL(url),
							)
						: section.setThumbnailAccessory((thumbnail) =>
								thumbnail
									.setURL(`attachment://${options.filename}`)
									.setDescription(`Proof of needing Ishhara from ${user.tag}.`),
							)
					).addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(
							`- \`${RSN}\` (${totalLevel})\n- ${VIP ? tick : cross} Premier Membership\n- ${sophAccess ? tick : cross} Sophanem access`,
						),
					),
				),
				new TextDisplayBuilder().setContent(
					`Once your request is verified, we'll start scouting!\n\nIf you have any queries, please send them in this channel and we will get back to you as soon as possible! You may familiarise yourself with ${channelMention(CORRUPTED_HELP_CHANNEL_ID)} additionally.`,
				),
			],
			files:
				"filename" in options
					? [
							{
								name: options.filename,
								attachment: url,
							},
						]
					: [],
			flags: MessageFlags.IsComponentsV2,
		};
	}

	public async edit(interaction: ChatInputCommandInteraction<"cached">, data: RequestEditData) {
		const [packet] = await pg<RequestPacket>(Table.Requests)
			.update(data)
			.where({ id: this.id })
			.returning("*");

		let editMessage = `Successfully edited ${this.channel}.`;
		let updateTranscript = false;
		let updateQueueStats = false;

		if (this.status !== data.status) {
			const messages = await this.channel!.messages.fetch();

			const closeMessage = messages.find(
				({ content }) => content === this.closeMessage(this.status as RequestCompletedStatus),
			);

			await closeMessage?.edit(this.closeMessage(data.status as RequestCompletedStatus));
			editMessage += `\nClose value altered from \`${this.status}\` to \`${data.status}\`.`;
			updateQueueStats = true;
			updateTranscript = true;
		}

		if (this.completionTimestamp !== data.completion_timestamp) {
			editMessage += `\nCompletion timestamp altered from ${time(
				this.completionTimestamp!.getTime(),
				TimestampStyles.LongDateTime,
			)} to ${time(data.completion_timestamp!.getTime(), TimestampStyles.LongDateTime)}.`;
		}

		const logMessage = `${interaction.user} (${
			interaction.user.tag
		}) ${editMessage[0].toLowerCase()}${editMessage.slice(1)}`;

		if (updateQueueStats) {
			await Request.updateQueueStats(interaction.client);
		}

		let packet2: RequestPacket | undefined;

		if (updateTranscript) {
			const transcriptHash = await this.archive(logMessage);

			[packet2] = await pg<RequestPacket>(Table.Requests)
				.update({ transcript: transcriptHash })
				.where({ id: this.id })
				.returning("*");
		} else {
			void interaction.client.log({ content: logMessage, type: LogType.CorruptedEggQueue });
		}

		this.patch(packet2 ?? packet);
		await Request.updateLookup(interaction.client, this);
		await interaction.editReply(editMessage);
	}

	public async verify(
		interaction: ChatInputCommandInteraction<"cached">,
		data: RequestApplication,
	) {
		const [packet] = await pg<RequestPacket>(Table.Requests)
			.update({ application: data, verified: true })
			.where({ id: this.id })
			.returning("*");

		const oldApplicationFormat = this.applicationFormat;
		this.patch(packet);
		const { applicationFormat } = this;

		const requestChannelVerifyBaseOptions =
			applicationFormat === oldApplicationFormat ? {} : { topic: this.applicationFormat! };

		try {
			await this.channel!.edit({ name: `request-${this.id}✓`, ...requestChannelVerifyBaseOptions });
		} catch (error) {
			if (
				error instanceof DiscordAPIError &&
				error.status === 400 &&
				error.code === RESTJSONErrorCodes.InvalidFormBodyOrContentType &&
				error.message.includes("Server Discovery")
			) {
				// Assume this is because the channel name (the number) is disallowed via Server Discovery rules.
				await this.channel!.edit({ name: "request-∞✓", ...requestChannelVerifyBaseOptions });
			} else {
				// This errored for other reasons.
				throw error;
			}
		}

		void interaction.client.log({
			content: `${interaction.user} (${interaction.user.tag}) has updated ${this.channel}'s application (${applicationFormat}).`,
			type: LogType.CorruptedEggQueue,
		});

		await interaction.editReply({
			allowedMentions: { parse: [] },
			content: interaction.ephemeral
				? `You have updated ${this.channel}'s application.`
				: `Thank you, ${userMention(this.userId)}! You'll be mentioned here when a scouter finds one for you.`,
		});

		this.applicationRateLimit = Date.now();
		await Request.updateLookup(interaction.client, this);
	}

	public static applicationFormat(application: RequestApplication): string;
	public static applicationFormat(application: null): null;
	public static applicationFormat(application: RequestData["application"]): string | null;

	public static applicationFormat(application: RequestData["application"]) {
		if (!application) {
			return null;
		}

		const tick = formatEmoji(EMOJIS.Tick);
		const cross = formatEmoji(EMOJIS.Cross);
		const VIPString = `${formatEmoji(EMOJIS.VIP)} ${application.VIP ? tick : cross}`;
		const sophAccessString = `${formatEmoji(EMOJIS.Sophanem)} ${application.sophAccess ? tick : cross}`;
		return `${application.RSN} | ${application.totalLevel} | ${VIPString} | ${sophAccessString}`;
	}

	public get applicationFormat() {
		return Request.applicationFormat(this.application);
	}

	public async close(
		status: RequestCompletedStatus,
		interaction: ButtonInteraction<"cached"> | ChatInputCommandInteraction<"cached"> | null = null,
		completionTimestamp: Date = interaction?.createdAt ?? new Date(),
		delay = false,
	) {
		if (delay) {
			this.delay = setTimeout(async () => {
				await interaction!.editReply({
					content: "This request has been automatically closed.",
					components: [],
				});

				await this.close(status, interaction, completionTimestamp);
			}, 60_000);

			const button = new DangerButtonBuilder()
				.setCustomId(`REQUEST-${this.id}-CLOSE-DELAY-NOW-${status}`)
				.setLabel("Close Now");

			const button2 = new SecondaryButtonBuilder()
				.setCustomId(`REQUEST-${this.id}-CLOSE-DELAY-CANCEL-${status}`)
				.setLabel("Cancel");

			const actionRow = new ActionRowBuilder().addComponents(button, button2);

			await interaction!.editReply({
				components: [actionRow],
				content: `This request will automatically close ${time(
					completionTimestamp.getTime(),
					TimestampStyles.RelativeTime,
				)}.`,
			});

			return;
		}

		const channel = this.channel as TextChannel;
		const closedBy = interaction?.user ?? (await this.client.guild.members.fetchMe()).user;

		if (this.corruptedArchive.children.cache.size >= 50) {
			await Promise.all(
				Request.cache
					.filter((request) => request.isInArchive())
					.first(this.corruptedArchive.children.cache.size - 49)
					.map(async (request) => request.channel!.delete()),
			);
		}

		await channel.edit({ lockPermissions: true, parent: this.corruptedArchive });
		const closeMessage = this.closeMessage(status);

		if (interaction === null || interaction.replied) {
			// When a requester leaves, there is no interaction.
			// When an interaction comes from a delay, it is already initially replied to.
			await channel.send(closeMessage);
		} else {
			await interaction.editReply(closeMessage);
		}

		let transcriptHash: string;

		switch (status) {
			case RequestStatus.Claimed: {
				transcriptHash = await this.archive(
					`Request ${this.id} (${this.channel}) has just been closed by ${closedBy} (${closedBy.tag}). Corrupted egg claimed.`,
				);

				await interaction!.followUp({
					content: "Be sure to log any corrupted egg found!",
					flags: MessageFlags.Ephemeral,
				});

				break;
			}
			case RequestStatus.LeftGuild: {
				transcriptHash = await this.archive(
					`Request ${this.id} (${this.channel}) has just been closed automatically. The requester is no longer in this server.`,
				);

				break;
			}
			case RequestStatus.DecidedAgainstService: {
				transcriptHash = await this.archive(
					`Request ${this.id} (${this.channel}) has just been closed by ${closedBy} (${closedBy.tag}). The requester decided against using our service.`,
				);

				break;
			}
			case RequestStatus.HadIshhara: {
				transcriptHash = await this.archive(
					`Request ${this.id} (${this.channel}) has just been closed by ${closedBy} (${closedBy.tag}). The requester had Ishhara all along.`,
				);

				break;
			}
			case RequestStatus.Unresponsive: {
				transcriptHash = await this.archive(
					`Request ${this.id} (${this.channel}) has just been closed by ${closedBy} (${closedBy.tag}). The requester did not respond.`,
				);

				break;
			}
			case RequestStatus.NotForSelf: {
				transcriptHash = await this.archive(
					`Request ${this.id} (${this.channel}) has just been closed by ${closedBy} (${closedBy.tag}). The requester either made a request for someone else or gave their corrupted egg away.`,
				);

				break;
			}
			case RequestStatus.UsedServiceToBuyOrSell: {
				transcriptHash = await this.archive(
					`Request ${this.id} (${this.channel}) has just been closed by ${closedBy} (${closedBy.tag}). The requester was found to buy or sell their corrupted egg.`,
				);

				break;
			}
			case RequestStatus.ApplicationFailed: {
				transcriptHash = await this.archive(
					`Request ${this.id} (${this.channel}) has just been closed by ${closedBy} (${closedBy.tag}). The requester failed to complete their application.`,
				);

				break;
			}
			case RequestStatus.ClaimedSelf: {
				transcriptHash = await this.archive(
					`Request ${this.id} (${this.channel}) has just been closed by ${closedBy} (${closedBy.tag}). The requester obtained their own corrupted egg.`,
				);

				break;
			}
		}

		const [packet] = await pg<RequestPacket>(Table.Requests)
			.update({ status, completion_timestamp: completionTimestamp, transcript: transcriptHash })
			.where({ id: this.id })
			.returning("*");

		this.patch(packet);
		await Request.updateLookup(this.client, this);
		await Request.updateQueueStats(this.client);
		await Request.updateArchiveOrder(this.client);
	}

	public async handleDelay(
		interaction: ButtonInteraction<"cached">,
		type: "CANCEL" | "NOW",
		status: RequestCompletedStatusViaUser,
	) {
		if (this.delay !== null) {
			clearTimeout(this.delay);
			this.delay = null;
		}

		if (type === "CANCEL") {
			await interaction.update({
				components: [],
				content: "Cancelled automatic close of request.",
			});
		} else {
			await interaction.update({
				content: "This request has been automatically closed.",
				components: [],
			});

			await this.close(status, interaction);
		}
	}

	public async archive(content: string) {
		const messages = await transcript(await fetchAllMessages(this.channel!));
		const contents = messages.join("\n");

		// If there already is a transcript, delete it.
		if (this.transcript) {
			await S3Client.send(
				new DeleteObjectCommand({
					Bucket: CDN_BUCKET,
					Key: Request.trancscriptRoute(this.id, this.transcript),
				}),
			);
		}

		const transcriptHash = await hash(contents, { algorithm: "md5" });

		await S3Client.send(
			new PutObjectCommand({
				Bucket: CDN_BUCKET,
				Key: Request.trancscriptRoute(this.id, transcriptHash),
				Body: contents,
				ContentDisposition: "inline",
				ContentType: "text/plain",
			}),
		);

		void this.client.log({
			content,
			files: [{ attachment: Buffer.from(contents), name: `${this.id}.txt` }],
			type: LogType.CorruptedEggQueue,
		});

		return transcriptHash;
	}

	public static trancscriptRoute(id: number, hash: string) {
		return `requests/${id}/${hash}.txt` as const;
	}

	public static transcriptURL(id: number, hash: string) {
		return String(new URL(Request.trancscriptRoute(id, hash), CDN_URL));
	}

	public closeMessage(status: RequestCompletedStatus) {
		switch (status) {
			case RequestStatus.Claimed: {
				return "This request will now be closed.";
			}
			case RequestStatus.LeftGuild: {
				return "The requester is no longer in the Soulobby Discord server. This request will now be closed.";
			}
			case RequestStatus.DecidedAgainstService: {
				return "This request will now be closed as the requester has decided against using our service.";
			}
			case RequestStatus.HadIshhara: {
				return "This request will now be closed as the requester already has Ishhara.";
			}
			case RequestStatus.Unresponsive: {
				return "This request will now be closed as the requester has not been responsive.";
			}
			case RequestStatus.NotForSelf: {
				return "This request will now be closed as the requester either made a request for someone else or gave their corrupted egg away.";
			}
			case RequestStatus.UsedServiceToBuyOrSell: {
				return "This request will now be closed as the requester used our service to buy or sell corrupted eggs.";
			}
			case RequestStatus.ApplicationFailed: {
				return "This request will now be closed as the requester has failed to complete their application.";
			}
			case RequestStatus.ClaimedSelf: {
				return "This request will now be closed as the requester has obtained a corrupted egg by themselves.";
			}
		}
	}

	public isInArchive(): this is this & {
		readonly channel: TextChannel;
		completionTimestamp: number;
		status: RequestCompletedStatus;
		transcript: string;
	} {
		return (
			this.channel?.parentId === this.corruptedArchive.id &&
			this.status !== RequestStatus.Active &&
			this.completionTimestamp !== null &&
			this.transcript !== null
		);
	}

	public async information(
		interaction:
			| ButtonInteraction<"cached">
			| ChatInputCommandInteraction<"cached">
			| UserContextMenuCommandInteraction<"cached">,
	) {
		const user = await interaction.client.users.fetch(this.userId, { cache: false });
		const { id, applicationFormat, transcript } = this;

		const container = new ContainerBuilder()
			.addSectionComponents((section) => {
				section
					.setThumbnailAccessory((thumbnail) => thumbnail.setURL(displayAvatarURL(user)))
					.addTextDisplayComponents(
						(textDisplay) => textDisplay.setContent(`## Request ${id}`),
						(textDisplay) => textDisplay.setContent(user.toString()),
					);

				if (applicationFormat) {
					section.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`**Application:** ${applicationFormat}`),
					);
				}

				return section;
			})
			.addSeparatorComponents((separator) =>
				separator.setDivider().setSpacing(SeparatorSpacingSize.Small),
			);

		const textDisplay = new TextDisplayBuilder().setContent(
			`**Status:** ${this.status}\n**Channel:** ${channelMention(this.channelId)}\n**Creation Date:** ${time(this.creationTimestamp, TimestampStyles.ShortDateTime)}\n**Completion Date:** ${this.completionTimestamp === null ? "Not set yet" : time(this.completionTimestamp.getTime(), TimestampStyles.ShortDateTime)}\n**Duration:** ${this.duration}`,
		);

		if (transcript) {
			container.addSectionComponents((section) =>
				section
					.setLinkButtonAccessory((linkButton) =>
						linkButton.setLabel("Transcript").setURL(Request.transcriptURL(this.id, transcript)),
					)
					.addTextDisplayComponents(textDisplay),
			);
		} else {
			container.addTextDisplayComponents(textDisplay);
		}

		const flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral)[] = [
			MessageFlags.IsComponentsV2,
		];

		if (interaction.isButton() || interaction.isUserContextMenuCommand()) {
			flags.push(MessageFlags.Ephemeral);
		}

		await interaction.reply({ allowedMentions: { parse: [] }, components: [container], flags });
	}

	public static async informationMultiple(
		interaction:
			| ChatInputCommandInteraction<"cached">
			| UserContextMenuCommandInteraction<"cached">,
		user: User,
	) {
		const requests = this.cache.filter((request) => request.userId === user.id);

		if (requests.size === 0) {
			await interaction.reply({
				content: `${user} does not have any requests with us.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (requests.size === 1) {
			await requests.first()!.information(interaction);
			return;
		}

		const container = new ContainerBuilder().addSectionComponents((section) =>
			section
				.setThumbnailAccessory((thumbnail) => thumbnail.setURL(displayAvatarURL(user)))
				.addTextDisplayComponents(
					(textDisplay) => textDisplay.setContent(`## Requests for ${user.username}`),
					(textDisplay) => textDisplay.setContent(user.toString()),
					(textDisplay) =>
						textDisplay.setContent(
							`Showing the recent ${Math.min(requests.size, 8)} of ${requests.size} requests.`,
						),
				),
		);

		for (const request of requests.last(8).values()) {
			container
				.addSeparatorComponents((separator) =>
					separator.setDivider().setSpacing(SeparatorSpacingSize.Small),
				)
				.addSectionComponents((section) =>
					section
						.setSecondaryButtonAccessory((button) =>
							button
								.setLabel("View")
								.setCustomId(`${CustomId.RequestViewRequestInformation}§${request.id}`),
						)
						.addTextDisplayComponents((textDisplay) =>
							textDisplay.setContent(
								`### Request ${request.id}\n\n**Status:** ${request.status}\n**Channel:** ${channelMention(request.channelId)}\n**Creation Date:** ${time(request.creationTimestamp, TimestampStyles.ShortDateTime)}\n**Completion Date:** ${request.completionTimestamp === null ? "Not set yet" : time(request.completionTimestamp.getTime(), TimestampStyles.ShortDateTime)}\n**Duration:** ${request.duration}`,
							),
						),
				);
		}

		const flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral)[] = [
			MessageFlags.IsComponentsV2,
		];

		if (interaction.isUserContextMenuCommand()) {
			flags.push(MessageFlags.Ephemeral);
		}

		await interaction.reply({
			allowedMentions: { parse: [] },
			components: [container],
			flags,
		});
	}

	public get channel() {
		return this.client.guild.channels.resolve(this.channelId) as TextChannel | null;
	}

	public get queueChat() {
		return this.client.channel(QUEUE_CHAT_CHANNEL_ID, ChannelType.GuildText);
	}

	public get corruptedArchive() {
		return this.client.channel(CORRUPTED_ARCHIVE_CHANNEL_ID, ChannelType.GuildCategory);
	}

	public get duration() {
		let duration = (this.completionTimestamp?.getTime() ?? Date.now()) - this.creationTimestamp;
		const years = Math.floor(duration / 31_536_000_000);
		duration -= years * 31_536_000_000;
		const months = Math.floor(duration / 2_628_002_880);
		duration -= months * 2_628_002_880;
		const days = Math.floor(duration / 86_400_000);
		duration -= days * 86_400_000;
		const hours = Math.floor(duration / 3_600_000);
		duration -= hours * 3_600_000;
		const minutes = Math.floor(duration / 60_000);
		duration -= minutes * 60_000;
		const seconds = Math.floor(duration / 1_000);
		duration -= seconds * 1_000;
		let durationText = years > 0 ? `${years} year${years === 1 ? "" : "s"} ` : "";
		durationText += months > 0 ? `${months} month${months === 1 ? "" : "s"} ` : "";
		durationText += days > 0 ? `${days} day${days === 1 ? "" : "s"} ` : "";
		durationText += hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"} ` : "";
		durationText += minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"} ` : "";
		durationText += seconds > 0 ? `${seconds} second${seconds === 1 ? "" : "s"}` : "";
		durationText ||= "0 seconds";

		if (!this.completionTimestamp) {
			durationText = `${durationText.trim()} so far`;
		}

		return durationText;
	}

	public get under3Days() {
		return Date.now() - this.creationTimestamp < 259_200_000;
	}

	public get under7Days() {
		return Date.now() - this.creationTimestamp < 604_800_000;
	}

	public static async updateLookup(
		client: Client,
		{
			id,
			userId,
			status,
			channelId,
			creationTimestamp,
			completionTimestamp = null,
			transcript = null,
			application = null,
			newRequest = false,
		}: RequestLookup,
	) {
		const queueView = client.channel(QUEUE_VIEW_CHANNEL_ID, ChannelType.GuildText);
		const lastRequest = this.cache.last();
		const create =
			newRequest &&
			this.cache.filter(({ lookup }) => lookup === lastRequest?.lookup).size % 24 === 0;
		let startNo = create ? id : id - ((id - 1) % 24);
		const endNo = startNo + 23;

		const embed = new EmbedBuilder()
			.setTitle(`${startNo} - ${endNo}`)
			.setColor((await client.guild.members.fetchMe()).displayColor);

		for (; startNo <= endNo; startNo++) {
			const request =
				startNo === id
					? {
							userId,
							status,
							channelId,
							creationTimestamp,
							completionTimestamp,
							transcript,
							application,
						}
					: Request.cache.get(startNo);

			const requestUserId = request ? `\`${request.userId}\`` : null;
			const requestRSN = request
				? request.application
					? `\`${request.application.RSN}\``
					: "??"
				: null;

			const requestStatus = request
				? request.transcript
					? `[${request.status}](${Request.transcriptURL(startNo, request.transcript)})`
					: request.status
				: null;

			const requestChannel = request ? channelMention(request.channelId) : null;
			const requestCreationTimestamp = request
				? time(request.creationTimestamp, TimestampStyles.ShortDate)
				: null;

			const requestCompletionTimestamp = request
				? request.completionTimestamp
					? time(request.completionTimestamp.getTime(), TimestampStyles.ShortDate)
					: "??"
				: null;

			embed.addFields({
				name: `Request ${startNo}`,
				value:
					requestUserId === null &&
					requestRSN === null &&
					requestStatus === null &&
					requestChannel === null &&
					requestCreationTimestamp === null &&
					requestCompletionTimestamp === null
						? "??"
						: `- ${requestUserId ?? "??"}\n- ${requestRSN ?? "??"}\n- ${requestStatus ?? "??"}\n- ${
								requestChannel ?? "??"
							}\n- ${requestCreationTimestamp ?? "??"}\n- ${requestCompletionTimestamp ?? "??"}`,
				inline: true,
			});
		}

		return create
			? queueView.send({ embeds: [embed] })
			: queueView.messages.edit(newRequest ? lastRequest!.lookup : Request.cache.get(id)!.lookup, {
					embeds: [embed],
				});
	}

	public static async updateQueueStats(client: Client) {
		const total = this.cache.size;
		let current = 0;
		let claimed = 0;
		let left = 0;
		let againstService = 0;
		let hadIshhara = 0;
		let unresponsive = 0;
		let notSelfMade = 0;
		let buyOrSell = 0;
		let applicationFailed = 0;
		let claimedSelf = 0;

		for (const request of this.cache.values()) {
			switch (request.status) {
				case RequestStatus.Active: {
					current++;
					break;
				}
				case RequestStatus.Claimed: {
					claimed++;
					break;
				}
				case RequestStatus.LeftGuild: {
					left++;
					break;
				}
				case RequestStatus.DecidedAgainstService: {
					againstService++;
					break;
				}
				case RequestStatus.HadIshhara: {
					hadIshhara++;
					break;
				}
				case RequestStatus.Unresponsive: {
					unresponsive++;
					break;
				}
				case RequestStatus.NotForSelf: {
					notSelfMade++;
					break;
				}
				case RequestStatus.UsedServiceToBuyOrSell: {
					buyOrSell++;
					break;
				}
				case RequestStatus.ApplicationFailed: {
					applicationFailed++;
					break;
				}
				case RequestStatus.ClaimedSelf: {
					claimedSelf++;
					break;
				}
			}
		}

		const embed = new EmbedBuilder()
			.setColor((await client.guild.members.fetchMe()).displayColor)
			.setFields(
				{ name: "Completed Requests", value: String(claimed), inline: true },
				{ name: "Current Requests", value: String(current), inline: true },
				{ name: "Left Server", value: String(left), inline: true },
				{ name: "Against Service", value: String(againstService), inline: true },
				{ name: "Had Ishhara", value: String(hadIshhara), inline: true },
				{ name: "Unresponsive (>= 7 Days)", value: String(unresponsive), inline: true },
				{ name: "Request Not Self-Made", value: String(notSelfMade), inline: true },
				{ name: "Buy/Sell", value: String(buyOrSell), inline: true },
				{ name: "Application Failed", value: String(applicationFailed), inline: true },
				{ name: "Claimed Self", value: String(claimedSelf), inline: true },
				{ name: "Total Requests", value: String(total), inline: true },
			)
			.setFooter({ text: "Last updated" })
			.setTimestamp()
			.setTitle("Corrupted Egg Queue Statistics");

		await client
			.channel(QUEUE_CHAT_CHANNEL_ID, ChannelType.GuildText)
			.messages.edit(QUEUE_CHAT1_MESSAGE_ID, { embeds: [embed] });
	}

	public static async updateArchiveOrder(client: Client) {
		let No = 1;

		await client.guild.channels.setPositions(
			this.cache
				.filter((request) => request.isInArchive())
				.map(({ channelId }) => ({ channel: channelId, position: No++ })),
		);
	}

	public static async role(interaction: ButtonInteraction<"cached">) {
		const { roles } = interaction.member;
		let content = `${roleMention(QUEUE_HELPER_ROLE_ID)} `;

		if (roles.cache.has(QUEUE_HELPER_ROLE_ID)) {
			await roles.remove(QUEUE_HELPER_ROLE_ID);
			content += "removed.";
		} else {
			await roles.add(QUEUE_HELPER_ROLE_ID);
			content += "added.";
		}

		await interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}
}
