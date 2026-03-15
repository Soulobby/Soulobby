import { ActionRowBuilder, SecondaryButtonBuilder } from "@discordjs/builders";
import { formatEmoji } from "@discordjs/formatters";
import { type ButtonInteraction, MessageFlags } from "discord.js";
import { LEARNER_ROLE_ID } from "../utility/configuration.js";
import { EMOJIS } from "../utility/emojis.js";
import { LogType } from "../utility/functions.js";

export const QUICK_GUIDE_QUICK_QUIZ_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_1_ANSWER_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_1_ANSWER_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_1_WRONG_1_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_1_WRONG_1_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_1_WRONG_2_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_1_WRONG_2_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_1_WRONG_3_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_1_WRONG_3_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_2_ANSWER_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_2_ANSWER_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_2_WRONG_1_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_2_WRONG_1_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_2_WRONG_2_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_2_WRONG_2_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_2_WRONG_3_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_2_WRONG_3_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_3_ANSWER_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_3_ANSWER_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_3_WRONG_1_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_3_WRONG_1_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_3_WRONG_2_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_3_WRONG_2_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_3_WRONG_3_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_3_WRONG_3_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_4_ANSWER_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_4_ANSWER_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_4_WRONG_1_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_4_WRONG_1_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_4_WRONG_2_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_4_WRONG_2_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_4_WRONG_3_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_4_WRONG_3_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_5_ANSWER_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_5_ANSWER_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_5_WRONG_1_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_5_WRONG_1_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_5_WRONG_2_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_5_WRONG_2_BUTTON_CUSTOM_ID" as const;

export const QUICK_GUIDE_QUICK_QUIZ_5_WRONG_3_BUTTON_CUSTOM_ID =
	"QUICK_GUIDE_QUICK_QUIZ_5_WRONG_3_BUTTON_CUSTOM_ID" as const;

const FEEDBACK_CORRECT = `${formatEmoji(EMOJIS.Tick)} Correct! Well done.` as const;

const QUICK_QUIZ_QUESTIONS_AND_ANSWERS = [
	{
		question:
			"A soul obelisk has just spawned in the Worker district in world 139. What is the call?",
		answer: new SecondaryButtonBuilder()
			.setCustomId(QUICK_GUIDE_QUICK_QUIZ_1_ANSWER_BUTTON_CUSTOM_ID)
			.setLabel("139 w f"),
		wrong: [
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_1_WRONG_1_BUTTON_CUSTOM_ID)
				.setLabel("139 w ua"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_1_WRONG_2_BUTTON_CUSTOM_ID)
				.setLabel("139 w d"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_1_WRONG_3_BUTTON_CUSTOM_ID)
				.setLabel("139 w"),
		],
		feedback: {
			[QUICK_GUIDE_QUICK_QUIZ_1_ANSWER_BUTTON_CUSTOM_ID]: FEEDBACK_CORRECT,
			[QUICK_GUIDE_QUICK_QUIZ_1_WRONG_1_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`ua\` means unknown age. Since it just spawned, the correct answer would be \`139 w f\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_1_WRONG_2_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`d\` means despawned. It just spawned! The correct answer would be \`139 w f\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_1_WRONG_3_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! Make sure to specify \`f\` for a fresh call. The correct answer would be \`139 w f\`.`,
		},
	},
	{
		question: "You find a soul obelisk in the Imperial district in world 44. What is the call?",
		answer: new SecondaryButtonBuilder()
			.setCustomId(QUICK_GUIDE_QUICK_QUIZ_2_ANSWER_BUTTON_CUSTOM_ID)
			.setLabel("44 i ua"),
		wrong: [
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_2_WRONG_1_BUTTON_CUSTOM_ID)
				.setLabel("44 i f"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_2_WRONG_2_BUTTON_CUSTOM_ID)
				.setLabel("44 i d"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_2_WRONG_3_BUTTON_CUSTOM_ID)
				.setLabel("44 i"),
		],
		feedback: {
			[QUICK_GUIDE_QUICK_QUIZ_2_ANSWER_BUTTON_CUSTOM_ID]: FEEDBACK_CORRECT,
			[QUICK_GUIDE_QUICK_QUIZ_2_WRONG_1_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`f\` means fresh (just spawned). We do not know if it just spawned. The correct answer would be \`44 i ua\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_2_WRONG_2_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`d\` means despawned. The correct answer would be \`44 i ua\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_2_WRONG_3_BUTTON_CUSTOM_ID]:
				"⚠️ Whilst acceptable, consider specifying `ua` for unknown age (`44 i ua`). Not specifying `ua` may imply an absence of knowledge. Realistically, this just means people can't flame you.",
		},
	},
	{
		question: "There are some corrupted scarabs in world 5. What is the call?",
		answer: new SecondaryButtonBuilder()
			.setCustomId(QUICK_GUIDE_QUICK_QUIZ_3_ANSWER_BUTTON_CUSTOM_ID)
			.setLabel("5 s ua"),
		wrong: [
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_3_WRONG_1_BUTTON_CUSTOM_ID)
				.setLabel("5 s f"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_3_WRONG_2_BUTTON_CUSTOM_ID)
				.setLabel("5 s d"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_3_WRONG_3_BUTTON_CUSTOM_ID)
				.setLabel("5 s m"),
		],
		feedback: {
			[QUICK_GUIDE_QUICK_QUIZ_3_ANSWER_BUTTON_CUSTOM_ID]: FEEDBACK_CORRECT,
			[QUICK_GUIDE_QUICK_QUIZ_3_WRONG_1_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`f\` means fresh (just spawned). We do now know if it just spawned. The correct answer would be \`5 s ua\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_3_WRONG_2_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`d\` means despawned. The correct answer would be \`5 s ua\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_3_WRONG_3_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! Corrupted scarabs spawn in _all_ districts. Ergo, only the world should be present. The correct answer would be \`5 s ua\`, where \`ua\` means unknown age.`,
		},
	},
	{
		question:
			"Some corrupted scarabs have despawned on world 6. They are no longer there. What is the call?",
		answer: new SecondaryButtonBuilder()
			.setCustomId(QUICK_GUIDE_QUICK_QUIZ_4_ANSWER_BUTTON_CUSTOM_ID)
			.setLabel("6 s d"),
		wrong: [
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_4_WRONG_1_BUTTON_CUSTOM_ID)
				.setLabel("6 s f"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_4_WRONG_2_BUTTON_CUSTOM_ID)
				.setLabel("6 s ua"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_4_WRONG_3_BUTTON_CUSTOM_ID)
				.setLabel("6 s"),
		],
		feedback: {
			[QUICK_GUIDE_QUICK_QUIZ_4_ANSWER_BUTTON_CUSTOM_ID]: FEEDBACK_CORRECT,
			[QUICK_GUIDE_QUICK_QUIZ_4_WRONG_1_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`f\` means fresh (just spawned). Since the corrupted scarabs have despawned, the correct answer would be \`6 s d\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_4_WRONG_2_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`ua\` means unknown age. Since it just despawned, the correct answer would be \`6 s d\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_4_WRONG_3_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`6 s\` simply means there are corrupted scarabs in world 6, implying \`ua\` (unknown age). Since the corrupted scarabs have despawned, the correct answer would be \`6 s d\`.`,
		},
	},
	{
		question:
			"A soul obelisk has just despawned in world 12. It was in the Worker district. What is the call?",
		answer: new SecondaryButtonBuilder()
			.setCustomId(QUICK_GUIDE_QUICK_QUIZ_5_ANSWER_BUTTON_CUSTOM_ID)
			.setLabel("12 w d"),
		wrong: [
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_5_WRONG_1_BUTTON_CUSTOM_ID)
				.setLabel("12 w f"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_5_WRONG_2_BUTTON_CUSTOM_ID)
				.setLabel("12 w ua"),
			new SecondaryButtonBuilder()
				.setCustomId(QUICK_GUIDE_QUICK_QUIZ_5_WRONG_3_BUTTON_CUSTOM_ID)
				.setLabel("12 w"),
		],
		feedback: {
			[QUICK_GUIDE_QUICK_QUIZ_5_ANSWER_BUTTON_CUSTOM_ID]: FEEDBACK_CORRECT,
			[QUICK_GUIDE_QUICK_QUIZ_5_WRONG_1_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! The soul obelisk is not fresh (just spawned). It despawned, so the correct call would be \`12 w d\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_5_WRONG_2_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`ua\` means unknown age. Since the soul obelisk just despawned, the correct answer would be \`12 w d\`.`,
			[QUICK_GUIDE_QUICK_QUIZ_5_WRONG_3_BUTTON_CUSTOM_ID]: `${formatEmoji(EMOJIS.Cross)} Incorrect! \`12 w\` simply means there is a soul obelisk in world 12 in the Worker district, implying \`ua\` (unknown age). Since the soul obelisk has despawned, the correct answer would be \`12 w d\`.`,
		},
	},
] as const;

export async function quickQuiz(interaction: ButtonInteraction<"cached">, index = 0) {
	const { component, customId, user } = interaction;
	let questionText = "";
	let logText = `${user} (${user.tag})`;

	if (index !== 0) {
		const { question, answer, feedback } = QUICK_QUIZ_QUESTIONS_AND_ANSWERS[index - 1];
		const answerJSON = answer.toJSON();

		if (answerJSON.label === undefined) {
			throw new Error("Missing label in button.");
		}

		logText += ` answered question ${index} ${component.label === answerJSON.label ? "correctly" : `incorrectly (\`${component.label}\`)`}.`;

		// @ts-expect-error This too painful for what it is worth.
		const feedbackMessage = feedback[customId];

		if (!feedbackMessage) {
			void interaction.client.log({
				type: LogType.QuickQuizLog,
				content: `${logText} Could not, however, apply feedback via \`${customId}\`.`,
				error: interaction,
			});

			throw new Error("Received incorrect feedback message.");
		}

		questionText = `> ${question}\nYour answer: \`${component.label}\`\n${feedbackMessage}\n\n`;

		if (index === 5) {
			logText += " Quick quiz finished.";
			void interaction.client.log({ type: LogType.QuickQuizLog, content: logText });

			await Promise.all([
				interaction.update({
					content: `${questionText}You have completed the quick quiz!`,
					components: [],
				}),
				interaction.member.roles.remove(LEARNER_ROLE_ID),
			]);

			return;
		}

		logText += ` Moving to question ${index + 1}.`;
	} else {
		logText += " started the quick quiz.";
	}

	void interaction.client.log({ type: LogType.QuickQuizLog, content: logText });
	const { question, answer, wrong } = QUICK_QUIZ_QUESTIONS_AND_ANSWERS[index];
	questionText += question;

	const response = {
		content: questionText,
		components: [
			new ActionRowBuilder().addComponents([answer, ...wrong].sort(() => Math.random() - 0.5)),
		],
	};

	await (index === 0
		? interaction.reply({ ...response, flags: MessageFlags.Ephemeral })
		: interaction.update(response));
}
