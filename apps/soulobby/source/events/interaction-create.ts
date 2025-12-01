import {
	ComponentType,
	DiscordAPIError,
	Events,
	type Interaction,
	InteractionType,
	MessageFlags,
	RESTJSONErrorCodes,
} from "discord.js";
import { IGNORE_LIST_EVIDENCE_REMOVAL_STRING_SELECT_MENU_CUSTOM_ID } from "../commands/chat-inputs/ignore.js";
import {
	AUTOCOMPLETE_COMMANDS,
	CHAT_INPUT_COMMANDS,
	USER_CONTEXT_MENU_COMMANDS,
} from "../commands/index.js";
import {
	OVERVIEW_SCHEDULE_RESET_CANCEL_CUSTOM_ID,
	OVERVIEW_SCHEDULE_RESET_CUSTOM_ID,
	OVERVIEW_SCHEDULE_RESET_NOW_CUSTOM_ID,
	OVERVIEW_SCHEDULED_RESET_MODAL_CUSTOM_ID,
	OVERVIEW_UPDATE_CUSTOM_ID,
	OVERVIEW_UPDATE_MODAL_CUSTOM_ID,
	scheduledResetCancel,
	scheduledResetNow,
	scheduleResetModal,
	scheduleResetModalSubmit,
	updateModal,
	updateModalSubmit,
} from "../features/rotations.js";
import Ignore from "../models/Ignore.js";
import {
	QUICK_GUIDE_QUICK_QUIZ_1_ANSWER_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_1_WRONG_1_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_1_WRONG_2_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_1_WRONG_3_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_2_ANSWER_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_2_WRONG_1_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_2_WRONG_2_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_2_WRONG_3_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_3_ANSWER_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_3_WRONG_1_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_3_WRONG_2_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_3_WRONG_3_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_4_ANSWER_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_4_WRONG_1_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_4_WRONG_2_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_4_WRONG_3_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_5_ANSWER_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_5_WRONG_1_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_5_WRONG_2_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_5_WRONG_3_BUTTON_CUSTOM_ID,
	QUICK_GUIDE_QUICK_QUIZ_BUTTON_CUSTOM_ID,
	quickQuiz,
} from "../models/QuickQuiz.js";
import { MAIL_REPORT_BUTTON, Report } from "../models/Report.js";
import Request, { REQUEST_ROLE_CUSTOM_ID } from "../models/Request.js";
import pino from "../pino.js";
import { GUILD_ID } from "../utility/configuration.js";
import type { RequestCompletedStatusViaUser } from "../utility/constants.js";
import { CustomId } from "../utility/custom-id.js";
import type { Event } from "./index.js";

const name = Events.InteractionCreate;

const interactionErrorResponseBody = {
	components: [
		{
			type: ComponentType.TextDisplay,
			content: "An error was encountered. Rest easy, it's being tracked!",
		},
	],
	flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
} as const;

async function recoverInteractionError(interaction: Interaction, error: unknown) {
	let errorTypeString = "Error ";

	switch (interaction.type) {
		case InteractionType.ApplicationCommand: {
			errorTypeString += `running command \`/${interaction.commandName}\`.`;
			break;
		}
		case InteractionType.ApplicationCommandAutocomplete: {
			errorTypeString += `autocompleting \`/${interaction.commandName}\`.`;
			break;
		}
		default: {
			errorTypeString += `performing \`${interaction.customId}\`.`;
			break;
		}
	}

	pino.error(error, errorTypeString);

	// We cannot respond to this.
	if (
		error instanceof DiscordAPIError &&
		(error.code === RESTJSONErrorCodes.UnknownInteraction ||
			error.code === RESTJSONErrorCodes.CannotSendAnEmptyMessage)
	) {
		return;
	}

	try {
		if (interaction.isAutocomplete()) {
			await interaction.respond([]);
		} else if (interaction.deferred || interaction.replied) {
			await interaction.followUp(interactionErrorResponseBody);
		} else {
			await interaction.reply(interactionErrorResponseBody);
		}
	} catch (error) {
		pino.error(error, "Failed to follow up or reply from recovering an interaction error.");
	}
}

export default {
	name,
	async fire(interaction) {
		if (!interaction.inCachedGuild() || interaction.guildId !== GUILD_ID) {
			return;
		}

		if (interaction.isChatInputCommand()) {
			pino.info(interaction, `Chat input command: ${interaction}`);
			const { commandName } = interaction;
			const command = CHAT_INPUT_COMMANDS.find(({ name }) => name === commandName);

			if (!command) {
				pino.warn(
					interaction,
					`Received an unknown chat input command interaction (\`${commandName}\`).`,
				);

				await interaction.reply({
					content: "This command is drifting away with the souls of the underworld...",
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			try {
				await command.chatInput(interaction);
			} catch (error) {
				await recoverInteractionError(interaction, error);
			}

			return;
		}

		if (interaction.isUserContextMenuCommand()) {
			pino.info(interaction, `User context menu command: ${interaction.commandName}`);
			const { commandName } = interaction;
			const command = USER_CONTEXT_MENU_COMMANDS.find(({ name }) => name === commandName);

			if (!command) {
				pino.warn(
					interaction,
					`Received an unknown user context menu command interaction (\`${commandName}\`).`,
				);

				await interaction.reply({
					content: "This command is drifting away with the souls of the underworld...",
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			try {
				await command.userContextMenu(interaction);
			} catch (error) {
				await recoverInteractionError(interaction, error);
			}

			return;
		}

		if (interaction.isButton()) {
			pino.info(interaction, `Button: ${interaction.customId}`);
			const { customId } = interaction;
			const [id, ...parts] = customId.split("§") as [string, ...string[]];

			try {
				if (customId === MAIL_REPORT_BUTTON) {
					await Report.createUserReportThread(interaction);
					return;
				}

				if (customId === QUICK_GUIDE_QUICK_QUIZ_BUTTON_CUSTOM_ID) {
					await quickQuiz(interaction);
					return;
				}

				if (
					customId === QUICK_GUIDE_QUICK_QUIZ_1_ANSWER_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_1_WRONG_1_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_1_WRONG_2_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_1_WRONG_3_BUTTON_CUSTOM_ID
				) {
					await quickQuiz(interaction, 1);
					return;
				}

				if (
					customId === QUICK_GUIDE_QUICK_QUIZ_2_ANSWER_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_2_WRONG_1_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_2_WRONG_2_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_2_WRONG_3_BUTTON_CUSTOM_ID
				) {
					await quickQuiz(interaction, 2);
					return;
				}

				if (
					customId === QUICK_GUIDE_QUICK_QUIZ_3_ANSWER_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_3_WRONG_1_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_3_WRONG_2_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_3_WRONG_3_BUTTON_CUSTOM_ID
				) {
					await quickQuiz(interaction, 3);
					return;
				}
				if (
					customId === QUICK_GUIDE_QUICK_QUIZ_4_ANSWER_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_4_WRONG_1_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_4_WRONG_2_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_4_WRONG_3_BUTTON_CUSTOM_ID
				) {
					await quickQuiz(interaction, 4);
					return;
				}
				if (
					customId === QUICK_GUIDE_QUICK_QUIZ_5_ANSWER_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_5_WRONG_1_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_5_WRONG_2_BUTTON_CUSTOM_ID ||
					customId === QUICK_GUIDE_QUICK_QUIZ_5_WRONG_3_BUTTON_CUSTOM_ID
				) {
					await quickQuiz(interaction, 5);
					return;
				}

				if (customId === "REQUEST") {
					await Request.validateNewRequest(interaction);
					return;
				}

				if (customId === REQUEST_ROLE_CUSTOM_ID) {
					await Request.role(interaction);
					return;
				}

				const requestRegExp =
					/REQUEST-(?<No>\d+)-CLOSE-DELAY-(?<type>CANCEL|NOW)-(?<status>\d)/.exec(customId);

				if (requestRegExp?.groups) {
					const type = requestRegExp.groups.type as "CANCEL" | "NOW";
					const status = Number(requestRegExp.groups.status) as RequestCompletedStatusViaUser;

					await Request.cache
						.get(Number(requestRegExp.groups.No))!
						.handleDelay(interaction, type, status);

					return;
				}

				if (id === CustomId.RequestViewRequestInformation) {
					await Request.cache.get(Number(parts[0]))!.information(interaction);
					return;
				}

				if (customId === OVERVIEW_UPDATE_CUSTOM_ID) {
					await updateModal(interaction);
					return;
				}

				if (customId === OVERVIEW_SCHEDULE_RESET_CUSTOM_ID) {
					await scheduleResetModal(interaction);
					return;
				}

				if (customId === OVERVIEW_SCHEDULE_RESET_NOW_CUSTOM_ID) {
					await scheduledResetNow(interaction);
					return;
				}

				if (customId === OVERVIEW_SCHEDULE_RESET_CANCEL_CUSTOM_ID) {
					await scheduledResetCancel(interaction);
					return;
				}

				// This is from editing a corrupted egg.
				if (/(?:YES|NO)-\d+/.test(customId)) {
					return;
				}
			} catch (error) {
				await recoverInteractionError(interaction, error);
				return;
			}

			pino.warn(interaction, `Received an unknown button interaction (\`${customId}\`).`);

			await interaction.reply({
				content: "You venture forth into the land of the unknown, but nothing seems to be around.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (interaction.isStringSelectMenu()) {
			pino.info(interaction, `String select: ${interaction.customId}`);
			const { customId } = interaction;

			try {
				if (customId.startsWith(IGNORE_LIST_EVIDENCE_REMOVAL_STRING_SELECT_MENU_CUSTOM_ID)) {
					await Ignore.removeEvidence(
						interaction,
						Number(customId.slice(customId.indexOf("§") + 1)),
					);

					return;
				}
			} catch (error) {
				await recoverInteractionError(interaction, error);
				return;
			}

			pino.warn(
				interaction,
				`Received an unknown string select menu interaction (\`${customId}\`).`,
			);

			await interaction.reply({
				content: "It appears you have selected an option that no longer exists. Incredible!",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (interaction.isModalSubmit()) {
			pino.info(interaction, `Modal submit: ${interaction.customId}`);
			const { customId } = interaction;

			try {
				if (interaction.isFromMessage()) {
					if (customId === CustomId.RequestModal) {
						await Request.create(interaction);
						return;
					}

					if (customId === OVERVIEW_UPDATE_MODAL_CUSTOM_ID) {
						await updateModalSubmit(interaction);
						return;
					}

					if (customId === OVERVIEW_SCHEDULED_RESET_MODAL_CUSTOM_ID) {
						await scheduleResetModalSubmit(interaction);
						return;
					}
				}
			} catch (error) {
				await recoverInteractionError(interaction, error);
				return;
			}

			pino.warn(interaction, `Received an unknown modal interaction (\`${customId}\`).`);

			await interaction.reply({
				content:
					"You entered all that text... for nothing. We have no idea what that is. _You_ have no idea what that is. I guess life just be like that sometimes.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (interaction.isAutocomplete()) {
			pino.info(interaction, `Autocomplete: ${interaction.commandName}`);
			const { commandName } = interaction;
			const command = AUTOCOMPLETE_COMMANDS.find(({ name }) => name === commandName);

			if (!command) {
				pino.warn(
					interaction,
					`Received an unknown autocomplete interaction (\`${commandName}\`).`,
				);

				await interaction.respond([]);
				return;
			}

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				await recoverInteractionError(interaction, error);
			}

			return;
		}

		if (interaction.isMessageContextMenuCommand()) {
			pino.warn(
				interaction,
				`Received an unknown message context menu interaction (\`${interaction.commandName}\`).`,
			);

			await interaction.reply({
				content:
					"This message is far too powerful for this command to be used on. Or maybe you need to level up?",
				flags: MessageFlags.Ephemeral,
			});
		}
	},
} satisfies Event<typeof name>;
