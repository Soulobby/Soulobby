import {
	ActionRowBuilder,
	ContainerBuilder,
	DangerButtonBuilder,
	ModalBuilder,
	SecondaryButtonBuilder,
	TextInputBuilder,
} from "@discordjs/builders";
import {
	formatEmoji,
	messageLink,
	roleMention,
	TimestampStyles,
	userMention,
} from "@discordjs/formatters";
import { diffJson } from "diff";
import {
	type ButtonInteraction,
	ChannelType,
	type Client,
	Locale,
	MessageFlags,
	type ModalMessageModalSubmitInteraction,
	SeparatorSpacingSize,
	type Snowflake,
	TextInputStyle,
	type User,
} from "discord.js";
import { Jewel, jewel } from "runescape";
import pg, { Table } from "../pg.js";
import {
	BLANCHY_ROLE_ID,
	DAILY_CAT_CHANNEL_ID,
	FENEKH_ROLE_ID,
	HETEPHERES_ROLE_ID,
	LUCIFURR_ROLE_ID,
	NODJMET_ROLE_ID,
	OVERVIEW_CHANNEL_ID,
	OVERVIEW1_MESSAGE_ID,
	TAKHUIT_ROLE_ID,
} from "../utility/configuration.js";
import {
	DailyCat,
	DailyCatToEmoji,
	DailyCatToRoleId,
	JEWELS_OF_THE_ELID_ROTATION,
	MAXIMUM_P2P_ENGLISH_SERVER_LENGTH,
	P2P_ENGLISH_SERVERS,
	type P2PEnglishServers,
	WIKI_CATS_OF_MENAPHOS,
} from "../utility/constants.js";
import { EMOJIS } from "../utility/emojis.js";
import { cat, deleteAllMessages, isP2PEnglishServer, time } from "../utility/functions.js";

const GULLIBLE_TOURIST_REGULAR_EXPRESSION = new RegExp(
	`^(?<world1>-1|${P2P_ENGLISH_SERVERS.join("|")})(?:,\\s*(?<world2>${P2P_ENGLISH_SERVERS.join("|")}))?$`,
);

interface RotationsPacket {
	aminishi_gem_trader: number | null;
	gullible_tourist: string | null;
	riddler_crab: number | null;
	tuai_leit_gem_trader: number | null;
	last_updated_at: Date;
	scheduled_reset_timestamp: Date | null;
	scheduled_reset_message_id: Snowflake | null;
	scheduled_reset_user_id: Snowflake | null;
	last_updated_by: Snowflake;
}

export const OVERVIEW_SCHEDULE_RESET_NOW_CUSTOM_ID =
	"OVERVIEW_SCHEDULE_RESET_NOW_CUSTOM_ID" as const;

export const OVERVIEW_SCHEDULE_RESET_CANCEL_CUSTOM_ID =
	"OVERVIEW_SCHEDULE_RESET_CANCEL_CUSTOM_ID" as const;

export const OVERVIEW_UPDATE_CUSTOM_ID = "OVERVIEW_UPDATE_CUSTOM_ID" as const;
export const OVERVIEW_SCHEDULE_RESET_CUSTOM_ID = "OVERVIEW_SCHEDULE_RESET_CUSTOM_ID" as const;
export const OVERVIEW_UPDATE_MODAL_CUSTOM_ID = "OVERVIEW_UPDATE_MODAL_CUSTOM_ID" as const;

const OVERVIEW_UPDATE_AMINISHI_GEM_TRADER_CUSTOM_ID =
	"OVERVIEW_UPDATE_AMINISHI_GEM_TRADER_CUSTOM_ID" as const;

const OVERVIEW_UPDATE_GULLIBLE_TOURIST_CUSTOM_ID =
	"OVERVIEW_UPDATE_GULLIBLE_TOURIST_CUSTOM_ID" as const;

const OVERVIEW_UPDATE_RIDDLER_CRAB_CUSTOM_ID = "OVERVIEW_UPDATE_RIDDLER_CRAB_CUSTOM_ID" as const;

const OVERVIEW_UPDATE_TUAI_LEIT_GEM_TRADER_CUSTOM_ID =
	"OVERVIEW_UPDATE_TUAI_LEIT_GEM_TRADER_CUSTOM_ID" as const;

export const OVERVIEW_SCHEDULED_RESET_MODAL_CUSTOM_ID =
	"OVERVIEW_SCHEDULED_RESET_MODAL_CUSTOM_ID" as const;

const OVERVIEW_SCHEDULE_RESET_TEXT_INPUT_CUSTOM_ID =
	"OVERVIEW_SCHEDULE_RESET_TEXT_INPUT_CUSTOM_ID" as const;

let scheduledResetTimeout: NodeJS.Timeout | null = null;

function transformOverview(overview: RotationsPacket) {
	return {
		...overview,
		gullible_tourist:
			overview.gullible_tourist === null
				? null
				: overview.gullible_tourist === "-1"
					? (-1 as const)
					: (JSON.parse(overview.gullible_tourist) as readonly number[]),
	};
}

async function fetchOverview() {
	return transformOverview((await pg<RotationsPacket>(Table.Rotations).first())!);
}

export async function healthCheck(client: Client<true>) {
	const overview = await fetchOverview();

	if (overview.last_updated_at.toDateString() === new Date().toDateString()) {
		const rotationsPacket = (await pg<RotationsPacket>(Table.Rotations).first())!;

		if (rotationsPacket.scheduled_reset_timestamp) {
			// Clear the timeout, just in case.
			if (scheduledResetTimeout) {
				clearTimeout(scheduledResetTimeout);
				scheduledResetTimeout = null;
			}

			scheduledResetTimeout = setTimeout(
				async () => await scheduledResetOperations(client),
				rotationsPacket.scheduled_reset_timestamp.getTime() - Date.now(),
			);
		}
	} else {
		await dailyReset(client);
	}
}

export async function updateModal(interaction: ButtonInteraction<"cached">) {
	const overview = await fetchOverview();

	const aminishiGemTrader = new TextInputBuilder()
		.setCustomId(OVERVIEW_UPDATE_AMINISHI_GEM_TRADER_CUSTOM_ID)
		.setMaxLength(MAXIMUM_P2P_ENGLISH_SERVER_LENGTH)
		.setRequired(false)
		.setStyle(TextInputStyle.Short);

	if (overview.aminishi_gem_trader) {
		aminishiGemTrader.setValue(overview.aminishi_gem_trader.toString());
	}

	const gullibleTourist = new TextInputBuilder()
		.setCustomId(OVERVIEW_UPDATE_GULLIBLE_TOURIST_CUSTOM_ID)
		.setMaxLength(MAXIMUM_P2P_ENGLISH_SERVER_LENGTH * 2 + 2)
		.setRequired(false)
		.setStyle(TextInputStyle.Short);

	if (overview.gullible_tourist) {
		gullibleTourist.setValue(
			overview.gullible_tourist === -1
				? "-1"
				: overview.gullible_tourist.toSorted((a, b) => a - b).join(", "),
		);
	}

	const riddlerCrab = new TextInputBuilder()
		.setCustomId(OVERVIEW_UPDATE_RIDDLER_CRAB_CUSTOM_ID)
		.setMaxLength(MAXIMUM_P2P_ENGLISH_SERVER_LENGTH)
		.setRequired(false)
		.setStyle(TextInputStyle.Short);

	if (overview.riddler_crab) {
		riddlerCrab.setValue(overview.riddler_crab.toString());
	}

	const tuaiLeitGemTrader = new TextInputBuilder()
		.setCustomId(OVERVIEW_UPDATE_TUAI_LEIT_GEM_TRADER_CUSTOM_ID)
		.setMaxLength(MAXIMUM_P2P_ENGLISH_SERVER_LENGTH)
		.setRequired(false)
		.setStyle(TextInputStyle.Short);

	if (overview.tuai_leit_gem_trader) {
		tuaiLeitGemTrader.setValue(overview.tuai_leit_gem_trader.toString());
	}

	await interaction.showModal(
		new ModalBuilder()
			.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent("`-1` should be used in the case there is no NPC on any world."),
			)
			.addLabelComponents(
				(label) => label.setLabel("Aminishi Gem Trader").setTextInputComponent(aminishiGemTrader),
				(label) =>
					label
						.setLabel("Gullible Tourist")
						.setDescription(
							"A maximum of 2 worlds may be specified. Use a comma to separate the worlds.",
						)
						.setTextInputComponent(gullibleTourist),
				(label) => label.setLabel("Riddler Crab").setTextInputComponent(riddlerCrab),
				(label) => label.setLabel("Tuai Leit Gem Trader").setTextInputComponent(tuaiLeitGemTrader),
			)
			.setCustomId(OVERVIEW_UPDATE_MODAL_CUSTOM_ID)
			.setTitle("Update Port NPCs"),
	);
}

export async function updateModalSubmit(interaction: ModalMessageModalSubmitInteraction<"cached">) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	const { components } = interaction;

	const aminishiGemTrader = components.getTextInputValue(
		OVERVIEW_UPDATE_AMINISHI_GEM_TRADER_CUSTOM_ID,
	);

	const gullibleTourist = components.getTextInputValue(OVERVIEW_UPDATE_GULLIBLE_TOURIST_CUSTOM_ID);
	const riddlerCrab = components.getTextInputValue(OVERVIEW_UPDATE_RIDDLER_CRAB_CUSTOM_ID);

	const tuaiLeitGemTrader = components.getTextInputValue(
		OVERVIEW_UPDATE_TUAI_LEIT_GEM_TRADER_CUSTOM_ID,
	);

	const payload: RotationUpdateOptions = { actor: interaction.user };

	if (aminishiGemTrader === "") {
		payload.aminishiGemTrader = null;
	} else {
		const aminishiGemTraderNumber = Number(aminishiGemTrader);

		if (aminishiGemTraderNumber === -1 || isP2PEnglishServer(aminishiGemTraderNumber)) {
			payload.aminishiGemTrader = aminishiGemTraderNumber;
		} else {
			await interaction.editReply("Invalid world provided for the Aminishi gem trader.");
			return;
		}
	}

	if (gullibleTourist === "") {
		payload.gullibleTourist = null;
	} else {
		const gullibleTouristRegExp = GULLIBLE_TOURIST_REGULAR_EXPRESSION.exec(gullibleTourist);

		if (gullibleTouristRegExp?.groups) {
			const { world1, world2 } = gullibleTouristRegExp.groups as {
				world1: "-1" | `${P2PEnglishServers}`;
				world2?: `${P2PEnglishServers}`;
			};

			const worlds = [Number(world1) as P2PEnglishServers | -1];

			if (world2) {
				if (world1 === "-1") {
					await interaction.editReply(
						"`-1` is used for no world found. Do not use `-1` if there is a world!",
					);

					return;
				}

				worlds.push(Number(world2) as P2PEnglishServers);
			}

			payload.gullibleTourist = world1 === "-1" ? -1 : (worlds as P2PEnglishServers[]);
		} else {
			await interaction.editReply("Invalid world provided for the gullible tourist.");
			return;
		}
	}

	if (riddlerCrab === "") {
		payload.riddlerCrab = null;
	} else {
		const riddlerCrabNumber = Number(riddlerCrab);

		if (riddlerCrabNumber === -1 || isP2PEnglishServer(riddlerCrabNumber)) {
			payload.riddlerCrab = riddlerCrabNumber;
		} else {
			await interaction.editReply("Invalid world provided for the riddler crab.");
			return;
		}
	}

	if (tuaiLeitGemTrader === "") {
		payload.tuaiLeitGemTrader = null;
	} else {
		const tuaiLeitGemTraderNumber = Number(tuaiLeitGemTrader);

		if (tuaiLeitGemTraderNumber === -1 || isP2PEnglishServer(tuaiLeitGemTraderNumber)) {
			payload.tuaiLeitGemTrader = tuaiLeitGemTraderNumber;
		} else {
			await interaction.editReply("Invalid world provided for the Tuai Leit gem trader.");
			return;
		}
	}

	const worlds = [
		payload.aminishiGemTrader,
		...(payload.gullibleTourist === -1
			? [-1]
			: payload.gullibleTourist
				? payload.gullibleTourist
				: []),
		payload.riddlerCrab,
		payload.tuaiLeitGemTrader,
	].filter((world) => world !== null && world !== -1);

	if (new Set(worlds).size !== worlds.length) {
		await interaction.editReply("Duplicate worlds detected.");
		return;
	}

	await updateRotations(interaction.client, payload);
	await interaction.editReply("Port NPC locations updated.");
}

export async function scheduleResetModal(interaction: ButtonInteraction<"cached">) {
	await interaction.showModal(
		new ModalBuilder()
			.addLabelComponents((label) =>
				label
					.setLabel("When should the rotations be reset?")
					.setTextInputComponent((textInput) =>
						textInput
							.setCustomId(OVERVIEW_SCHEDULE_RESET_TEXT_INPUT_CUSTOM_ID)
							.setMaxLength(5)
							.setMinLength(5)
							.setPlaceholder("HH:MM")
							.setRequired(true)
							.setStyle(TextInputStyle.Short),
					),
			)
			.setCustomId(OVERVIEW_SCHEDULED_RESET_MODAL_CUSTOM_ID)
			.setTitle("Scheduled Reset"),
	);
}

export async function scheduleResetModalSubmit(
	interaction: ModalMessageModalSubmitInteraction<"cached">,
) {
	const rotationsPacket = (await pg<RotationsPacket>(Table.Rotations).first())!;

	// Is there already a scheduled reset?
	if (rotationsPacket.scheduled_reset_message_id) {
		await interaction.reply({
			content: `[There is already a scheduled reset.](${messageLink(OVERVIEW_CHANNEL_ID, rotationsPacket.scheduled_reset_message_id)})`,
			flags: MessageFlags.Ephemeral,
		});

		return;
	}

	// Ensure the time is in the correct format.
	const timeRegularExpression = /([0-2]\d):([0-5]\d)/.exec(
		interaction.components.getTextInputValue(OVERVIEW_SCHEDULE_RESET_TEXT_INPUT_CUSTOM_ID),
	);

	if (!timeRegularExpression) {
		await interaction.reply({
			content: "Invalid time format. The format should be `HH:MM`.",
			flags: MessageFlags.Ephemeral,
		});

		return;
	}

	const hours = Number(timeRegularExpression[1]);
	const minutes = Number(timeRegularExpression[2]);
	const resetDate = new Date();
	resetDate.setUTCHours(hours, minutes, 0, 0);
	const resetTimestamp = resetDate.getTime();

	if (resetTimestamp < Date.now()) {
		await interaction.reply({
			content: "The time specified has already passed.",
			flags: MessageFlags.Ephemeral,
		});

		return;
	}

	const timestampMarkdown = time(resetTimestamp, TimestampStyles.LongDateShortTime, true);

	void interaction.client.log({
		content: `${interaction.user} (${interaction.user.tag}) scheduled a reset of the rotations for ${timestampMarkdown}.`,
	});

	const response = await interaction.reply({
		allowedMentions: { parse: [] },
		content: `Rotations scheduled to reset at ${timestampMarkdown} by ${interaction.user}.`,
		components: [
			new ActionRowBuilder().addComponents(
				new DangerButtonBuilder()
					.setCustomId(OVERVIEW_SCHEDULE_RESET_NOW_CUSTOM_ID)
					.setLabel("Reset now"),
				new SecondaryButtonBuilder()
					.setCustomId(OVERVIEW_SCHEDULE_RESET_CANCEL_CUSTOM_ID)
					.setLabel("Cancel"),
			),
		],
		withResponse: true,
	});

	await pg<RotationsPacket>(Table.Rotations).update({
		scheduled_reset_timestamp: resetDate,
		scheduled_reset_message_id: response.resource!.message!.id,
		scheduled_reset_user_id: interaction.user.id,
	});

	scheduledResetTimeout = setTimeout(
		async () => await scheduledResetOperations(interaction.client),
		resetTimestamp - Date.now(),
	);
}

async function resetRotations(client: Client<true>, lastUpdatedBy: Snowflake) {
	const [rotation] = await pg<RotationsPacket>(Table.Rotations).update(
		{
			aminishi_gem_trader: null,
			gullible_tourist: null,
			riddler_crab: null,
			tuai_leit_gem_trader: null,
			last_updated_at: new Date(),
			scheduled_reset_timestamp: null,
			scheduled_reset_message_id: null,
			scheduled_reset_user_id: null,
			last_updated_by: lastUpdatedBy,
		},
		"*",
	);

	await client
		.channel(OVERVIEW_CHANNEL_ID, ChannelType.GuildText)
		.messages.edit(OVERVIEW1_MESSAGE_ID, {
			allowedMentions: { parse: [] },
			components: [await overviewComponents(client, transformOverview(rotation))],
			flags: MessageFlags.IsComponentsV2,
		});
}

interface RotationUpdateOptions {
	actor: User;
	aminishiGemTrader?: P2PEnglishServers | -1 | null;
	gullibleTourist?: P2PEnglishServers[] | -1 | null;
	riddlerCrab?: P2PEnglishServers | -1 | null;
	tuaiLeitGemTrader?: P2PEnglishServers | -1 | null;
}

async function updateRotations(
	client: Client<true>,
	{
		actor,
		aminishiGemTrader,
		gullibleTourist,
		riddlerCrab,
		tuaiLeitGemTrader,
	}: RotationUpdateOptions,
) {
	const overview = await fetchOverview();

	const [updatedRotation] = await pg<RotationsPacket>(Table.Rotations).update(
		{
			aminishi_gem_trader: aminishiGemTrader,
			gullible_tourist: gullibleTourist === null ? null : JSON.stringify(gullibleTourist),
			riddler_crab: riddlerCrab,
			tuai_leit_gem_trader: tuaiLeitGemTrader,
			last_updated_at: new Date(),
			last_updated_by: actor.id,
		},
		"*",
	);

	const old = JSON.stringify(overview, null, 2);
	const updated = JSON.stringify(transformOverview(updatedRotation), null, 2);
	const diffedJSON = diffJson(old, updated, { oneChangePerToken: true });
	let diffResult = "";

	for (const part of diffedJSON) {
		const text = part.added ? "+" : part.removed ? "-" : "";
		diffResult += `${text}${part.value.slice(part.added || part.removed ? 1 : 0)}`;
	}

	void client.log({
		content: `${actor} (${actor.tag}) updated the rotations.\n\`\`\`diff\n${diffResult}\n\`\`\``,
	});

	await client
		.channel(OVERVIEW_CHANNEL_ID, ChannelType.GuildText)
		.messages.edit(OVERVIEW1_MESSAGE_ID, {
			allowedMentions: { parse: [] },
			components: [await overviewComponents(client, transformOverview(updatedRotation))],
			flags: MessageFlags.IsComponentsV2,
		});
}

export async function dailyReset(client: Client<true>) {
	await resetRotations(client, client.user.id);

	if (scheduledResetTimeout) {
		clearTimeout(scheduledResetTimeout);
		scheduledResetTimeout = null;
	}

	const currentCat = cat();
	const dailyCat = client.channel(DAILY_CAT_CHANNEL_ID, ChannelType.GuildText);
	await dailyCat.edit({ name: currentCat ?? "daily-cat" });

	await Promise.all(
		[
			LUCIFURR_ROLE_ID,
			TAKHUIT_ROLE_ID,
			FENEKH_ROLE_ID,
			NODJMET_ROLE_ID,
			BLANCHY_ROLE_ID,
			HETEPHERES_ROLE_ID,
		].map((roleId) => {
			const role = client.guild.roles.cache.get(roleId);

			return role?.name === currentCat
				? role.mentionable
					? null
					: role.setMentionable(true)
				: role?.mentionable
					? role.setMentionable(false)
					: null;
		}),
	);

	await deleteAllMessages(dailyCat);

	await dailyCat.send(
		currentCat === null
			? "There is currently no daily cat."
			: currentCat === DailyCat.Blanchy
				? `${roleMention(DailyCatToRoleId[currentCat])} has spawned in Menaphos.`
				: `${roleMention(DailyCatToRoleId[currentCat])} is roaming!`,
	);
}

export async function scheduledResetNow(interaction: ButtonInteraction<"cached">) {
	void interaction.client.log({
		content: `${interaction.user} (${interaction.user.tag}) performed an immediate reset of the rotations from a scheduled reset.`,
	});

	await scheduledResetOperations(interaction.client);

	await interaction.reply({
		content: "Scheduled reset performed now.",
		flags: MessageFlags.Ephemeral,
	});
}

export async function scheduledResetCancel(interaction: ButtonInteraction<"cached">) {
	void interaction.client.log({
		content: `${interaction.user} (${interaction.user.tag}) cancelled a scheduled reset of the rotations.`,
	});

	await pg<RotationsPacket>(Table.Rotations).update({
		scheduled_reset_timestamp: null,
		scheduled_reset_message_id: null,
		scheduled_reset_user_id: null,
	});

	if (scheduledResetTimeout) {
		clearTimeout(scheduledResetTimeout);
		scheduledResetTimeout = null;
	}

	await interaction.message.delete();

	await interaction.reply({
		content: "Scheduled reset cancelled.",
		flags: MessageFlags.Ephemeral,
	});
}

async function scheduledResetOperations(client: Client<true>) {
	const rotationsPacket = (await pg<RotationsPacket>(Table.Rotations).first())!;

	await client
		.channel(OVERVIEW_CHANNEL_ID, ChannelType.GuildText)
		.messages.delete(rotationsPacket.scheduled_reset_message_id!);

	await resetRotations(client, rotationsPacket.scheduled_reset_user_id!);

	if (scheduledResetTimeout) {
		clearTimeout(scheduledResetTimeout);
		scheduledResetTimeout = null;
	}
}

async function overviewComponents(
	client: Client<true>,
	rotationsPacket: Pick<
		ReturnType<typeof transformOverview>,
		| "aminishi_gem_trader"
		| "gullible_tourist"
		| "riddler_crab"
		| "tuai_leit_gem_trader"
		| "last_updated_at"
		| "last_updated_by"
	>,
) {
	const now = Date.now();
	const catToday = cat();
	const catTomorrow = cat(1);
	let apmeken: Date | null = null;
	let scabarite: Date | null = null;
	const jewelsDate = new Date();
	jewelsDate.setUTCDate(jewelsDate.getUTCDate() + 1);
	jewelsDate.setUTCHours(0, 0, 0, 0);

	for (
		;
		apmeken === null || scabarite === null;
		jewelsDate.setUTCDate(jewelsDate.getUTCDate() + 1)
	) {
		const currentJewel = jewel(jewelsDate.getTime());

		if (apmeken === null && currentJewel === Jewel.ApmekenAmethyst) {
			const apmekenDate = new Date(jewelsDate);
			apmeken = apmekenDate;
		}

		if (scabarite === null && currentJewel === Jewel.ScabariteCrystal) {
			const scabariteDate = new Date(jewelsDate);
			scabarite = scabariteDate;
		}
	}

	const jewelToday = jewel(now);

	const jewelTodayString = `**${
		jewelToday === Jewel.ApmekenAmethyst
			? `${formatEmoji(EMOJIS.ApmekenAmethyst)} Apmeken amethyst`
			: jewelToday === Jewel.ScabariteCrystal
				? `${formatEmoji(EMOJIS.ScabariteCrystal)} Scabarite crystal`
				: "None"
	}**`;

	let apmekenString = Intl.DateTimeFormat(Locale.EnglishGB).format(apmeken);
	apmekenString = `${apmekenString} (${time(apmeken.getTime(), TimestampStyles.RelativeTime)})`;
	let scabariteString = Intl.DateTimeFormat(Locale.EnglishGB).format(scabarite);
	scabariteString = `${scabariteString} (${time(scabarite.getTime(), TimestampStyles.RelativeTime)})`;

	return new ContainerBuilder()
		.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`### Port NPCs\n\nAminishi Gem Trader: **${rotationsPacket.aminishi_gem_trader === -1 ? "None" : (rotationsPacket.aminishi_gem_trader ?? "Unknown")}**\nGullible Tourist: **${rotationsPacket.gullible_tourist === null ? "Unknown" : rotationsPacket.gullible_tourist === -1 ? "None" : rotationsPacket.gullible_tourist.toSorted((a, b) => a - b).join(" | ")}**\nRiddler Crab: **${rotationsPacket.riddler_crab === -1 ? "None" : (rotationsPacket.riddler_crab ?? "Unknown")}**\nTuai Leit Gem Trader: **${rotationsPacket.tuai_leit_gem_trader === -1 ? "None" : (rotationsPacket.tuai_leit_gem_trader ?? "Unknown")}**`,
			),
		)
		.addActionRowComponents((actionRow) =>
			actionRow
				.addPrimaryButtonComponents((primaryButton) =>
					primaryButton.setCustomId(OVERVIEW_UPDATE_CUSTOM_ID).setLabel("Update"),
				)
				.addSecondaryButtonComponents((secondaryButton) =>
					secondaryButton.setCustomId(OVERVIEW_SCHEDULE_RESET_CUSTOM_ID).setLabel("Schedule Reset"),
				),
		)
		.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`-# Last updated by ${userMention(rotationsPacket.last_updated_by)} at ${Intl.DateTimeFormat(Locale.EnglishGB, { timeStyle: "short" }).format(rotationsPacket.last_updated_at)} (${time(rotationsPacket.last_updated_at.getTime(), TimestampStyles.RelativeTime)})`,
			),
		)
		.addSeparatorComponents((separator) =>
			separator.setDivider().setSpacing(SeparatorSpacingSize.Small),
		)
		.addSectionComponents((section) =>
			section
				.setLinkButtonAccessory((linkButton) =>
					linkButton.setLabel("Wiki").setURL(WIKI_CATS_OF_MENAPHOS),
				)
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`### Daily cat\n\n${catToday === null ? `[None](${client.channel(DAILY_CAT_CHANNEL_ID).url})` : `${formatEmoji(DailyCatToEmoji[catToday])} [**${catToday}**](${client.channel(DAILY_CAT_CHANNEL_ID).url})`}\n-# Tomorrow: ${catTomorrow === null ? "None" : `${formatEmoji(DailyCatToEmoji[catTomorrow])} ${catTomorrow}`}`,
					),
				),
		)
		.addSeparatorComponents((separator) =>
			separator.setDivider().setSpacing(SeparatorSpacingSize.Small),
		)
		.addSectionComponents((section) =>
			section
				.setLinkButtonAccessory((linkButton) =>
					linkButton.setLabel("Wiki").setURL(JEWELS_OF_THE_ELID_ROTATION),
				)
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`### Jewels\n\nToday: ${jewelTodayString}\n-# Next ${formatEmoji(EMOJIS.ApmekenAmethyst)} Apmeken amethyst: ${apmekenString}\n-# Next ${formatEmoji(EMOJIS.ScabariteCrystal)} Scabarite crystal: ${scabariteString}`,
					),
				),
		);
}
