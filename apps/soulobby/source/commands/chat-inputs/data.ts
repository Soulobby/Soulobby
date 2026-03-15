import { EmbedBuilder } from "@discordjs/builders";
import { formatEmoji, TimestampStyles, userMention } from "@discordjs/formatters";
import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { avatar } from "runescape";
import type { CorruptedEggPacket } from "../../models/Calls.js";
import Friend from "../../models/Friend.js";
import pg, { Table } from "../../pg.js";
import { CAPTAIN_ROLE_ID, GENERAL_ROLE_ID } from "../../utility/configuration.js";
import { EMOJIS } from "../../utility/emojis.js";
import { time } from "../../utility/functions.js";

export default {
	name: "data" as const,
	async chatInput(interaction: ChatInputCommandInteraction<"cached">) {
		const number = interaction.options.getInteger("number");
		const userId = interaction.options.getUser("user")?.id ?? null;
		const resolvedUserId = userId ?? interaction.user.id;

		if (
			(number || userId) &&
			!interaction.member.roles.cache.hasAny(GENERAL_ROLE_ID, CAPTAIN_ROLE_ID)
		) {
			await interaction.reply({
				content: "You are not authorised to perform this action.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (number && userId) {
			await interaction.reply({
				content: "Please only provide a number or a user.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const friend = Friend.cache.find((friend) =>
			number === null ? friend.userId === resolvedUserId : friend.id === number,
		);

		const data: Partial<Pick<CorruptedEggPacket, "user_id">> &
			Pick<CorruptedEggPacket, "logged_for"> = {
			logged_for: null,
		};

		const userIdToFind = number === null ? resolvedUserId : friend?.userId;

		if (userIdToFind) {
			data.user_id = userIdToFind;
		}

		const logged = (
			await pg<CorruptedEggPacket>(Table.CorruptedEggs).where(data).count({ total: "*" }).first()
		)?.total;

		const loggedCount = logged ? Number(logged) : 0;

		if (!friend && loggedCount === 0) {
			await interaction.reply({
				content: `There is no information ${number || userId ? "to display" : "about you"}.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const embeds: EmbedBuilder[] = [];

		if (friend) {
			embeds.push(
				await this.dataEmbed(interaction, friend),
				...(await Promise.all(
					friend.altId.map(async (altId) => this.dataEmbed(interaction, Friend.cache.get(altId)!)),
				)),
			);
		}

		await interaction.reply({
			content: `${formatEmoji(EMOJIS.CorruptedEgg)} Corrupted eggs logged: ${loggedCount}`,
			embeds,
			flags: MessageFlags.Ephemeral,
		});
	},
	async dataEmbed(interaction: ChatInputCommandInteraction<"cached">, friend: Friend) {
		const currentRSN = `Current RSN: \`${friend.RSN}\``;
		const userId = friend.userId ? `\nUser: ${userMention(friend.userId)}` : "";
		const isRanked = `\`${friend.RSN}\` is ${friend.isRanked() ? "currently a rank" : "not currently ranked"}.`;
		const alts =
			friend.altId.length > 0
				? `\n\`${friend.RSN}\` has registered alts:\n${friend.altId
						.map((id) => `\`[${id < 10 ? "0" : ""}${id}]\` \`${Friend.cache.get(id)!.RSN}\``)
						.join("\n")}`
				: "";

		return new EmbedBuilder()
			.setColor((await interaction.client.guild.members.fetchMe()).displayColor)
			.setDescription(`${currentRSN}${userId}\n\n${isRanked}${alts}`)
			.setFields(
				friend.history.map(({ rank, date }) => ({
					name: rank,
					value: date ? time(date, TimestampStyles.FullDateShortTime) : "Unknown",
				})),
			)
			.setThumbnail(avatar({ name: friend.RSN }))
			.setTitle(friend.initialRSN);
	},
} as const;
